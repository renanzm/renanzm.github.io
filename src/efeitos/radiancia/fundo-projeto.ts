/* Fundo de luz das páginas de projeto, adaptado de renderer.ts do exemplo "Radiance Cascades" do
 * vgpu: uma grade escura iluminada pela luz global (jump flood + cascatas), com o triângulo de luz
 * do exemplo e a pintura de luz arrastando o mouse.
 *
 * Igual ao exemplo: superfície sem auto-resize com dpr de 1 a 2, medida por ResizeObserver e
 * ajustada no quadro seguinte (e de novo se o devicePixelRatio mudar); a cena refeita quando o
 * tamanho muda (o que apaga a pintura, como no exemplo); a cadeia só roda quando os emissores
 * mudam; nada roda com a aba oculta; dispose() desfaz tudo, com a falha original preservada.
 *
 * Diferente, porque aqui é o fundo de uma página de texto:
 *   - o triângulo de luz fica no canto de cima, à direita, na cor do projeto, e cresce ao abrir
 *     a página (sem crescer, para quem prefere menos movimento);
 *   - a cena (a luz) roda na resolução de CSS, até 1920×1080 (ver escalaDaCena em
 *     simulation.ts); a grade é desenhada na resolução da tela (ver present.wgsl), e os traços e o triângulo são redesenhados nítidos num canvas 2D por cima, na
 *     resolução da tela, com a mesma forma e a mesma cor que a luz mostra embaixo;
 *   - traços mais finos que os do exemplo (6 px de raio em CSS);
 *   - o quadro só é redesenhado quando algo muda (o exemplo redesenha todo quadro);
 *   - a pintura só começa fora do texto e só com mouse ou caneta (ver pintura.ts);
 *   - divide o contexto de GPU (efeitos/contexto.ts), sem o lil-gui de depuração do exemplo. */
import { surface, type Surface } from 'vgpu';
import { reservarGpu } from '../contexto';
import { instalarPintura, type PaintSegment } from './pintura';
import {
  createScene,
  destroyScene,
  escalaDaCena,
  prepareScene,
  presentScene,
  runChain,
  strokeRadiance,
  type RadianceScene,
} from './simulation';

/** Força da luz sobre a grade: o texto fica por cima. */
const INTENSIDADE = 0.85;
/** Segundos em que o triângulo de luz cresce ao abrir a página. */
const ABERTURA = 1.8;
/** Raio do traço pintado, em px de CSS. */
const RAIO_TRACO = 6;
/** Onde fica o triângulo, em frações da tela, e o raio final em fração do lado menor. */
const TRIANGULO = { x: 0.82, y: 0.2, raio: 0.075 } as const;

interface Opcoes {
  readonly canvas: HTMLCanvasElement;
  /** Canvas 2D por cima da luz, para os traços e o triângulo nítidos. */
  readonly tinta: HTMLCanvasElement;
  /** Cor do projeto (#rrggbb): a cor da luz. */
  readonly cor: string;
}

type Vec3 = readonly [number, number, number];

/** #rrggbb → radiância linear (HDR, como o branco quente do exemplo, perto de 3,5). */
function radianciaDaCor(hex: string): [number, number, number] {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [3.8, 3.2, 2.4];
  const linear = (c: string) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const rgb = [linear(m[1]!), linear(m[2]!), linear(m[3]!)];
  const maior = Math.max(...rgb, 1e-3);
  // Mantém o tom da cor e a força de uma luz forte, com um pouco de branco para não saturar
  return rgb.map((c) => (0.25 + 0.75 * (c / maior)) * 3.6) as [number, number, number];
}

/** A cor com que present.wgsl mostra um emissor: ACES e sRGB, como no shader. */
function corNaTela(radiancia: Vec3) {
  const aces = (x: number) => Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)));
  const srgb = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
  const [r, g, b] = radiancia.map((c) => Math.round(255 * srgb(aces(c * 0.85 * INTENSIDADE))));
  return `rgb(${r}, ${g}, ${b})`;
}

export function criarFundoDeLuz({ canvas, tinta, cor }: Opcoes) {
  let disposed = false;
  const reserva = reservarGpu();
  let canvasSurface: Surface | undefined;
  let scene: RadianceScene | undefined;
  let input: ReturnType<typeof instalarPintura> | undefined;
  let observer: ResizeObserver | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let animationFrame = 0;
  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
  let lastDpr = window.devicePixelRatio;
  let dirty = true;
  let clearRequested = false;
  let precisaApresentar = true;
  let inicio = 0;
  let cssSize: readonly [number, number] = [1, 1];
  /** Tamanho da cena (luz) para a área atual: a resolução de CSS, até o teto de escalaDaCena. */
  const tamanhoDaCena = (): [number, number] => {
    const e = escalaDaCena(cssSize[0], cssSize[1]);
    return [cssSize[0] * e, cssSize[1] * e];
  };
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const radiancia = radianciaDaCor(cor);

  // Os traços nítidos: o que foi pintado desde a última vez que a cena foi refeita
  const nitido = tinta.getContext('2d');
  const trechos: PaintSegment[] = [];
  let raioDoTriangulo = 0;
  let redesenharTinta = true;

  /** Triângulo de luz no canto de cima, à direita, crescendo durante a abertura. */
  const triangulo = (agora: number) => {
    const [w, h] = scene!.size;
    const progresso = calmo ? 1 : Math.min(1, (agora - inicio) / 1000 / ABERTURA);
    const suave = 1 - (1 - progresso) ** 3;
    return {
      centro: [w * TRIANGULO.x, h * TRIANGULO.y] as const,
      raio: Math.max(0.5, Math.min(w, h) * TRIANGULO.raio * suave),
      radiancia,
      crescendo: progresso < 1,
    };
  };

  /** Um trecho de traço no canvas nítido: a cápsula que paint-emitter.wgsl desenha na luz. */
  const desenharTrecho = ({ from, to, stroke }: PaintSegment) => {
    if (!nitido) return;
    const [w, h] = [tinta.width, tinta.height];
    nitido.lineCap = 'round';
    nitido.lineWidth = 2 * RAIO_TRACO * (w / Math.max(1, cssSize[0]));
    nitido.strokeStyle = corNaTela(strokeRadiance(stroke));
    nitido.beginPath();
    nitido.moveTo(from[0] * w, from[1] * h);
    nitido.lineTo(to[0] * w, to[1] * h);
    nitido.stroke();
  };

  /** Tudo de novo no canvas nítido: o triângulo e, por cima, os traços. */
  const redesenhar = () => {
    if (!nitido || !scene) return;
    const [w, h] = [tinta.width, tinta.height];
    nitido.clearRect(0, 0, w, h);
    // O raio do triângulo está em px da cena; o canvas nítido, em px da tela
    const r = raioDoTriangulo * (w / scene.size[0]);
    const [cx, cy] = [w * TRIANGULO.x, h * TRIANGULO.y];
    if (r > 0.5) {
      nitido.fillStyle = corNaTela(radiancia);
      nitido.beginPath();
      nitido.moveTo(cx, cy - r);
      nitido.lineTo(cx + r * 0.8660254, cy + r * 0.5);
      nitido.lineTo(cx - r * 0.8660254, cy + r * 0.5);
      nitido.closePath();
      nitido.fill();
    }
    for (const trecho of trechos) desenharTrecho(trecho);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    observer?.disconnect();
    window.removeEventListener('resize', onWindowResize);
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
    trechos.length = 0;
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

  const rebuildScene = () => {
    const previous = scene;
    if (disposed || !canvasSurface || !previous) return;
    try {
      const next = createScene(previous.gpu, tamanhoDaCena(), 'pintura', 'fundo');
      scene = next;
      destroyScene(previous);
      clearRequested = true;
      dirty = true;
      // A cena nova começa sem a pintura (como no exemplo): os traços nítidos saem junto
      trechos.length = 0;
      void prepareScene(next, canvasSurface.format).catch((error: unknown) => {
        if (!disposed && scene === next) fail(error);
      });
    } catch (error) {
      fail(error);
    }
  };

  const onSurfaceResize = () => {
    if (!scene) return;
    const [w, h] = tamanhoDaCena().map(Math.floor);
    if (scene.size[0] !== w || scene.size[1] !== h) rebuildScene();
    precisaApresentar = true;
  };

  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size || !canvasSurface) return;
    try {
      cssSize = [size.width, size.height];
      const pixels = [Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))] as const;
      // Mudar o tamanho do canvas nítido o apaga: o tick redesenha
      tinta.width = pixels[0];
      tinta.height = pixels[1];
      redesenharTinta = true;
      canvasSurface.resize(pixels);
    } catch (error) {
      fail(error);
    }
  };

  const measure = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    pendingSize = { width, height, dpr: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  };

  function onWindowResize() {
    if (window.devicePixelRatio === lastDpr) return;
    lastDpr = window.devicePixelRatio;
    measure();
  }

  const tick = (agora: number) => {
    animationFrame = 0;
    if (disposed) return;
    if (!document.hidden && canvasSurface && scene && input) {
      try {
        const segment = input.take();
        const luz = triangulo(agora);
        if (segment || luz.crescendo) dirty = true;
        if (dirty) {
          runChain(scene, { segment, keepPrevious: !clearRequested, triangulo: luz, raioTraco: RAIO_TRACO * (scene.size[0] / Math.max(1, cssSize[0])) });
          // Os traços nítidos: só o trecho novo, ou tudo quando o triângulo muda ou a cena é nova
          if (segment) trechos.push(segment);
          if (clearRequested || luz.raio !== raioDoTriangulo) redesenharTinta = true;
          else if (segment && !redesenharTinta) desenharTrecho(segment);
          raioDoTriangulo = luz.raio;
          clearRequested = false;
          dirty = false;
          precisaApresentar = true;
        }
        if (redesenharTinta) {
          redesenhar();
          redesenharTinta = false;
        }
        if (precisaApresentar) {
          presentScene(scene, canvasSurface, {
            intensidade: INTENSIDADE,
            dpr: canvasSurface.size[0] / Math.max(1, cssSize[0]),
          });
          precisaApresentar = false;
        }
      } catch (error) {
        fail(error);
      }
    }
    animationFrame = requestAnimationFrame(tick);
  };

  const initialize = async () => {
    if (!nitido) throw new Error('Canvas 2D indisponível para os traços nítidos do fundo.');
    const gpu = await reserva.gpu;
    if (disposed) return;
    const { width, height } = canvas.getBoundingClientRect();
    cssSize = [Math.max(1, width), Math.max(1, height)];
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixels = [Math.max(1, Math.round(cssSize[0] * dpr)), Math.max(1, Math.round(cssSize[1] * dpr))] as const;
    tinta.width = pixels[0];
    tinta.height = pixels[1];
    canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
    canvasSurface.resize(pixels);
    scene = createScene(gpu, tamanhoDaCena(), 'pintura', 'fundo');
    await prepareScene(scene, canvasSurface.format);
    if (disposed) return;

    input = instalarPintura(canvas);
    unsubscribeResize = canvasSurface.onResize(onSurfaceResize);
    observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(canvas);
    window.addEventListener('resize', onWindowResize);
    inicio = performance.now();
    animationFrame = requestAnimationFrame(tick);
  };

  const ready = initialize().catch((error: unknown) => {
    if (!disposed) fail(error);
  });

  return { ready, dispose };
}
