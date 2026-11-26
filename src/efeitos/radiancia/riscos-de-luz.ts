/* Riscos de luz no fundo da abertura: arrastar o mouse no fundo risca uma linha que vira luz,
 * espalhada pelo Radiance Cascades com as sombras suaves que os riscos fazem uns nos outros, e que
 * apaga sozinha alguns segundos depois. Adaptado de renderer.ts do exemplo "Radiance Cascades" do
 * vgpu.
 *
 * Igual ao exemplo: superfície sem auto-resize, medida por ResizeObserver e ajustada no quadro
 * seguinte; a cena é refeita quando o tamanho muda; nada roda com a aba oculta; e dispose() desfaz
 * tudo, com a falha original preservada se a limpeza também falhar.
 *
 * Diferente:
 *   - cada trecho de risco guarda a hora em que foi feito: fica aceso um pouco e depois apaga. A
 *     cada quadro com riscos, os emissores são redesenhados num canvas 2D do tamanho da cena (o
 *     alfa é a forma do risco e o vermelho é o quanto ele ainda brilha, ver emissor-imagem.wgsl)
 *     e enviados para a GPU;
 *   - o risco em si é desenhado nítido num segundo canvas 2D, na resolução da tela; a luz roda em
 *     40% da resolução de CSS (ela é suave);
 *   - só a luz em volta dos riscos, atenuada pela distância (luz.wgsl), sem a grade do exemplo;
 *   - o arraste começa só no fundo da abertura, fora dos textos e links (ver pintura.ts);
 *   - sem riscos na tela, o loop para, e volta no próximo risco;
 *   - divide o contexto de GPU com o resto do site (efeitos/contexto.ts). */
import { surface, type Surface } from 'vgpu';
import { reservarGpu } from '../contexto';
import { instalarPintura } from './pintura';
import {
  createScene,
  destroyScene,
  enviarImagem,
  prepareScene,
  presentScene,
  runChain,
  type RadianceScene,
} from './simulation';

/** Resolução da cena (luz) em relação aos px de CSS. */
const ESCALA = 0.4;
/** Branco quente, um pouco menos amarelo que o do triângulo do exemplo (3.8, 3.2, 2.4). */
const RADIANCIA = [3.6, 3.3, 2.9] as const;
const EXPOSICAO = 0.8;
/** Distância (px da cena, ~2,5 px de CSS cada) em que a luz cai pela metade longe do risco. */
const ALCANCE = 18;
/** Segundos que o risco fica aceso, e quantos leva apagando depois. */
const ACESO = 1.2;
const APAGANDO = 2.4;
/** Espessura do risco nítido e do emissor de luz por trás dele, em px de CSS. */
const TRACO = 2;
const EMISSOR = 5;
/** Cor do risco nítido: o branco quente da luz. */
const COR = [255, 246, 234] as const;
/** Onde o arraste não vira risco: links, botões e os textos da abertura. */
const IGNORAR = 'a, button, input, textarea, select, label, summary, p';

interface Opcoes {
  /** Canvas da luz (WebGPU), no fundo da abertura. */
  readonly canvas: HTMLCanvasElement;
  /** Canvas do risco nítido (2D), logo acima da luz. */
  readonly tinta: HTMLCanvasElement;
  /** Onde o arraste pode começar: a abertura. */
  readonly area: HTMLElement;
}

interface Risco {
  readonly de: readonly [number, number];
  readonly para: readonly [number, number];
  /** Hora do quadro em que o trecho entrou (ms, do requestAnimationFrame). */
  feito: number;
}

/** Quanto um trecho ainda brilha, de 1 a 0, pela idade em segundos. */
function brilho(idade: number) {
  if (idade <= ACESO) return 1;
  const resto = 1 - (idade - ACESO) / APAGANDO;
  return resto <= 0 ? 0 : resto * resto;
}

export function criarRiscosDeLuz({ canvas, tinta, area }: Opcoes) {
  let disposed = false;
  const reserva = reservarGpu();
  let canvasSurface: Surface | undefined;
  let scene: RadianceScene | undefined;
  let input: ReturnType<typeof instalarPintura> | undefined;
  let observer: ResizeObserver | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let animationFrame = 0;
  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number } | undefined;
  let rebuilding = false;
  let cssSize: readonly [number, number] = [1, 1];

  const riscos: Risco[] = [];
  /** Há luz na tela: quando o último risco apaga, falta um quadro para limpar. */
  let aceso = false;

  // Os emissores, no tamanho da cena, e o risco nítido, na resolução da tela
  const raster = document.createElement('canvas');
  const emissores = raster.getContext('2d');
  const nitido = tinta.getContext('2d');

  const desenhar = (agora: number) => {
    if (!emissores || !nitido || !scene) return;
    const [w, h] = scene.size;
    const [tw, th] = [tinta.width, tinta.height];
    const dpr = tw / Math.max(1, cssSize[0]);
    emissores.clearRect(0, 0, w, h);
    nitido.clearRect(0, 0, tw, th);
    for (const ctx of [emissores, nitido]) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    emissores.lineWidth = Math.max(1.5, EMISSOR * ESCALA);
    nitido.lineWidth = TRACO * dpr;
    // Do mais antigo ao mais novo: onde um risco cruza o outro, vale o mais aceso
    for (const { de, para, feito } of riscos) {
      const b = brilho((agora - feito) / 1000);
      if (b <= 0) continue;
      const v = Math.round(255 * b);
      emissores.strokeStyle = `rgb(${v}, ${v}, ${v})`;
      emissores.beginPath();
      emissores.moveTo(de[0] * w, de[1] * h);
      emissores.lineTo(para[0] * w, para[1] * h);
      emissores.stroke();
      nitido.strokeStyle = `rgb(${Math.round(COR[0] * b)}, ${Math.round(COR[1] * b)}, ${Math.round(COR[2] * b)})`;
      nitido.beginPath();
      nitido.moveTo(de[0] * tw, de[1] * th);
      nitido.lineTo(para[0] * tw, para[1] * th);
      nitido.stroke();
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    observer?.disconnect();
    let firstError: unknown;
    for (const cleanup of [
      unsubscribeResize,
      () => input?.dispose(),
      () => scene && destroyScene(scene),
      () => canvasSurface?.dispose(),
      () => reserva.soltar(),
    ]) {
      try {
        cleanup?.();
      } catch (error) {
        firstError ??= error;
      }
    }
    riscos.length = 0;
    nitido?.clearRect(0, 0, tinta.width, tinta.height);
    if (firstError) throw firstError;
  };

  const fail = (error: unknown): never => {
    try {
      dispose();
    } catch {
      // Keep the operation failure primary after best-effort teardown.
    }
    throw error;
  };

  const acordar = () => {
    if (!disposed && !animationFrame) animationFrame = requestAnimationFrame(tick);
  };

  function tick(agora: number) {
    animationFrame = 0;
    if (disposed || !canvasSurface || !scene || !input) return;
    const trecho = input.take();
    if (trecho) riscos.push({ de: trecho.from, para: trecho.to, feito: agora });
    // Os trechos entram em ordem: os apagados estão no começo
    const vida = (ACESO + APAGANDO) * 1000;
    while (riscos.length && agora - riscos[0]!.feito > vida) riscos.shift();
    if (!document.hidden && (riscos.length || aceso)) {
      try {
        desenhar(agora);
        enviarImagem(scene, raster);
        runChain(scene, { radiancia: RADIANCIA });
        presentScene(scene, canvasSurface, { intensidade: 1, exposicao: EXPOSICAO, alcance: ALCANCE });
        aceso = riscos.length > 0;
      } catch (error) {
        fail(error);
      }
    }
    if (riscos.length) acordar();
  }

  const rebuildScene = () => {
    const previous = scene;
    if (disposed || !canvasSurface || !previous) return;
    rebuilding = true;
    try {
      const next = createScene(previous.gpu, canvasSurface.size, 'imagem', 'luz');
      scene = next;
      destroyScene(previous);
      raster.width = next.size[0];
      raster.height = next.size[1];
      void prepareScene(next, canvasSurface.format).catch((error: unknown) => {
        if (!disposed && scene === next) fail(error);
      });
    } catch (error) {
      fail(error);
    } finally {
      rebuilding = false;
    }
  };

  // O exemplo ignora o primeiro aviso de tamanho; aqui a cena é refeita só se o tamanho mudou
  const onSurfaceResize = () => {
    if (rebuilding || !scene || !canvasSurface) return;
    const [w, h] = canvasSurface.size;
    if (scene.size[0] !== Math.floor(w) || scene.size[1] !== Math.floor(h)) rebuildScene();
    // Mudar o tamanho de um canvas apaga o que ele tinha: os riscos vivos são redesenhados
    aceso = true;
    acordar();
  };

  /** O canvas nítido na resolução da tela (até 2x). */
  const ajustarTinta = (width: number, height: number) => {
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    tinta.width = Math.max(1, Math.round(width * dpr));
    tinta.height = Math.max(1, Math.round(height * dpr));
  };

  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size || !canvasSurface) return;
    try {
      cssSize = [size.width, size.height];
      ajustarTinta(size.width, size.height);
      canvasSurface.resize([Math.max(1, Math.round(size.width * ESCALA)), Math.max(1, Math.round(size.height * ESCALA))]);
    } catch (error) {
      fail(error);
    }
  };

  const measure = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    pendingSize = { width, height };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  };

  const initialize = async () => {
    if (!emissores || !nitido) throw new Error('Canvas 2D indisponível para desenhar os riscos de luz.');
    const gpu = await reserva.gpu;
    if (disposed) return;
    const { width, height } = canvas.getBoundingClientRect();
    cssSize = [Math.max(1, width), Math.max(1, height)];
    ajustarTinta(cssSize[0], cssSize[1]);
    canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: 1 });
    canvasSurface.resize([Math.max(1, Math.round(cssSize[0] * ESCALA)), Math.max(1, Math.round(cssSize[1] * ESCALA))]);
    scene = createScene(gpu, canvasSurface.size, 'imagem', 'luz');
    raster.width = scene.size[0];
    raster.height = scene.size[1];
    await prepareScene(scene, canvasSurface.format);
    if (disposed) return;

    input = instalarPintura(canvas, { area, ignorar: IGNORAR, aoPintar: acordar });
    unsubscribeResize = canvasSurface.onResize(onSurfaceResize);
    observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(canvas);
    if (import.meta.env.DEV) Object.assign(window, { riscosDeLuz: { riscos, acordar } });
  };

  const ready = initialize().catch((error: unknown) => {
    if (!disposed) fail(error);
  });

  return { ready, dispose };
}
