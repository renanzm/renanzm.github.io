/* Adaptado de renderer.ts do exemplo "Holographic Card" do vgpu.
 *
 * Igual ao exemplo: init/surface/effect do vgpu com dpr de 1 a 2, compile() antes do primeiro
 * quadro, o foil revelado conforme o cursor se aproxima (com a mesma curva suave), a mesma
 * suavização pelo deltaTime para inclinação, luz e revelação, prefers-reduced-motion sem
 * inclinação, e dispose() que tira os listeners e libera a GPU.
 *
 * Diferente, porque aqui há um cartão em cada projeto da página:
 *   - os cartões dividem um único contexto de GPU (um device) e um único loop de quadros; o
 *     contexto é liberado quando o último cartão sai, e cada cartão libera a própria superfície e
 *     o próprio efeito;
 *   - o loop só roda enquanto algum cartão está mudando: apagado, o cartão desenha um último
 *     quadro preto (que não aparece no modo screen) e sai do loop; aceso e com o cursor parado, o
 *     quadro não muda (o shader não depende do tempo), então ele também sai até o cursor mexer;
 *   - o cursor é ouvido na seção do projeto, não no canvas: o canvas não recebe cliques, que
 *     continuam indo para o link da moldura;
 *   - o cartão ocupa o canvas inteiro, então o cursor é medido em relação às bordas dele, e a
 *     aproximação começa a meia altura do cartão (o do exemplo é pequeno e começava a uma largura
 *     inteira de distância, o que aqui acenderia o foil na seção toda); a aproximação começa a um
 *     terço da altura do cartão.
 */
import { clock, frameLoop, init, surface, type FrameLoopHandle, type Gpu, type Surface } from 'vgpu';
import { criarCena } from './cena';

interface Cartao {
  saida: Surface;
  cena: ReturnType<typeof criarCena>;
  alvo: number;
  hover: number;
  ponteiroX: number;
  ponteiroY: number;
  tiltX: number;
  tiltY: number;
  luzX: number;
  luzY: number;
}

/* ------------------------------------------------- contexto e loop compartilhados */
let pedido: Promise<Gpu> | undefined;
let gpu: Gpu | undefined;
let usuarios = 0;
let loop: FrameLoopHandle | undefined;
let primeiroQuadro = true;
const acesos = new Set<Cartao>();

function pedirGpu(): Promise<Gpu> {
  if (!pedido) {
    const este = init();
    pedido = este;
    este.then(
      (contexto) => {
        if (pedido === este) gpu = contexto;
      },
      () => {
        if (pedido === este) pedido = undefined;
      },
    );
  }
  return pedido;
}

/** O último cartão saiu: para o loop e libera o device (também se o init() ainda estiver correndo). */
function soltarGpu() {
  usuarios = Math.max(0, usuarios - 1);
  if (usuarios > 0) return;
  loop?.stop();
  loop = undefined;
  acesos.clear();
  const este = pedido;
  pedido = undefined;
  gpu = undefined;
  este?.then(
    (contexto) => contexto.dispose(),
    () => {},
  );
}

const limitar = (v: number) => Math.max(-1, Math.min(1, v));

// Em desenvolvimento, o estado do loop fica à mão para conferir que ele para sozinho
if (import.meta.env.DEV && typeof window !== 'undefined')
  Object.assign(window, { holografico: { acesos: () => acesos.size, rodando: () => Boolean(loop), usuarios: () => usuarios } });

function acender(cartao: Cartao) {
  acesos.add(cartao);
  if (loop || !gpu) return;
  const contexto = gpu;
  const tempo = clock(contexto);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  primeiroQuadro = true;
  loop = frameLoop(
    contexto,
    (quadro) => {
      // Depois de uma pausa, o primeiro deltaTime seria a pausa inteira: começa com um quadro normal
      const dt = primeiroQuadro ? 1 / 60 : Math.min(tempo.deltaTime, 0.1);
      primeiroQuadro = false;
      const blend = motion.matches ? 1 : 1 - Math.exp(-10 * dt);
      for (const c of acesos) {
        const alvoX = motion.matches ? 0 : limitar(c.ponteiroX) * 0.16 * c.alvo;
        const alvoY = motion.matches ? 0 : -limitar(c.ponteiroY) * 0.12 * c.alvo;
        c.tiltX += (alvoX - c.tiltX) * blend;
        c.tiltY += (alvoY - c.tiltY) * blend;
        c.hover += (c.alvo - c.hover) * blend;
        if (c.alvo > 0) {
          c.luzX += (c.ponteiroX - c.luzX) * blend;
          c.luzY += (c.ponteiroY - c.luzY) * blend;
        }
        // Apagou de vez (um último quadro preto) ou assentou com o cursor parado: o cartão sai do
        // loop depois deste quadro, e o canvas fica mostrando o último quadro
        const apagou = c.alvo === 0 && c.hover < 0.002;
        const assentou =
          Math.abs(c.alvo - c.hover) < 0.001 &&
          Math.abs(alvoX - c.tiltX) < 1e-4 &&
          Math.abs(alvoY - c.tiltY) < 1e-4 &&
          (c.alvo === 0 || (Math.abs(c.ponteiroX - c.luzX) < 1e-4 && Math.abs(c.ponteiroY - c.luzY) < 1e-4));
        if (apagou) c.hover = 0;
        c.cena.set({ params: { tilt: [c.tiltX, c.tiltY], pointer: [c.luzX, c.luzY], hover: c.hover } });
        quadro.pass(c.saida, c.cena);
        if (apagou || assentou) acesos.delete(c);
      }
      // Sem cartão aceso, o loop para (logo depois deste quadro, não no meio dele)
      if (!acesos.size)
        queueMicrotask(() => {
          if (acesos.size) return;
          loop?.stop();
          loop = undefined;
        });
    },
    { fps: 60 },
  );
}

/* ------------------------------------------------------------- um cartão */
/** Liga o foil holográfico a um canvas que cobre a moldura de um projeto. `area` é onde o cursor
 * é ouvido (a seção do projeto inteira, para o foil acender quando ele se aproxima). */
export function criarCartaoHolografico(canvas: HTMLCanvasElement, area: HTMLElement) {
  let disposed = false;
  let removeInput = () => {};
  let liberar = () => {};
  usuarios++;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    removeInput();
    liberar();
    soltarGpu();
  };

  const ready = (async () => {
    const context = await pedirGpu();
    if (disposed) return;
    const saida = surface(context, canvas, { dpr: [1, 2] });
    const cena = criarCena(context, saida);
    const cartao: Cartao = {
      saida,
      cena,
      alvo: 0,
      hover: 0,
      ponteiroX: 0,
      ponteiroY: 0,
      tiltX: 0,
      tiltY: 0,
      luzX: 0.2,
      luzY: -0.25,
    };
    liberar = () => {
      acesos.delete(cartao);
      cena.dispose();
      saida.dispose();
    };
    await cena.compile({ colors: [saida.format] });
    if (disposed) return;

    // Raio do canto da moldura (CSS), nas unidades do cartão: meia altura = 0,91
    const ajustar = () => {
      const raio = parseFloat(getComputedStyle(canvas.parentElement ?? canvas).borderTopLeftRadius) || 0;
      const corner = (raio / Math.max(1, canvas.clientHeight / 2)) * 0.91;
      cena.set({ params: { resolution: saida.size, corner } });
      // Mudar o tamanho limpa o canvas: um cartão aceso precisa de um quadro novo
      if (cartao.hover > 0) acender(cartao);
    };
    ajustar();

    const move = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const rect = canvas.getBoundingClientRect();
      const meiaLargura = Math.max(1, rect.width / 2);
      const meiaAltura = Math.max(1, rect.height / 2);
      // De -1 a 1 entre as bordas do cartão, como pointer/0,64 e pointer/0,91 no exemplo
      cartao.ponteiroX = (event.clientX - rect.left - meiaLargura) / meiaLargura;
      cartao.ponteiroY = (event.clientY - rect.top - meiaAltura) / meiaAltura;
      const distanceX = Math.max(0, Math.abs(cartao.ponteiroX) - 1) * meiaLargura;
      const distanceY = Math.max(0, Math.abs(cartao.ponteiroY) - 1) * meiaAltura;
      const proximity = Math.max(0, 1 - Math.hypot(distanceX, distanceY) / (meiaAltura * 0.66));
      cartao.alvo = proximity * proximity * (3 - 2 * proximity);
      if (cartao.alvo > 0) acender(cartao);
    };
    const leave = () => {
      cartao.alvo = 0;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') leave();
    };
    area.addEventListener('pointermove', move, { passive: true });
    area.addEventListener('pointerdown', move, { passive: true });
    area.addEventListener('pointerleave', leave);
    area.addEventListener('pointercancel', leave);
    area.addEventListener('pointerup', up);
    // Fora da tela, o cartão apaga mesmo que o cursor tenha ficado parado em cima dele
    const visivel = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) leave();
    });
    visivel.observe(canvas);
    const unsubscribeResize = saida.onResize(ajustar);
    removeInput = () => {
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerdown', move);
      area.removeEventListener('pointerleave', leave);
      area.removeEventListener('pointercancel', leave);
      area.removeEventListener('pointerup', up);
      visivel.disconnect();
      unsubscribeResize();
    };
  })().catch((error: unknown) => {
    if (disposed) return;
    dispose();
    throw error;
  });

  return { ready, dispose };
}
