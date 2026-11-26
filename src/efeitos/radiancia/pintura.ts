/* Adaptado de pointer-input.ts do exemplo "Radiance Cascades" do vgpu: pintar luz arrastando com o
 * botão apertado, cada arraste um traço novo (com a sua cor), e os trechos juntados até o próximo
 * quadro pegar.
 *
 * Diferente, porque aqui o canvas é o fundo de uma página de texto: o arraste começa numa área
 * (a janela inteira, ou só a abertura) e segue pela janela; só pinta com mouse ou caneta (no
 * toque, arrastar é rolar a página); e só quando o arraste começa no fundo, e não num texto,
 * link, imagem ou campo (para não brigar com selecionar e clicar). */
export interface PaintSegment {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly stroke: number;
}

const CONTEUDO = 'a, button, input, textarea, select, label, p, h1, h2, h3, h4, li, dt, dd, figcaption, img, video, code, pre, table, blockquote, summary';

interface Opcoes {
  /** Onde o arraste pode começar (padrão: a janela inteira). */
  readonly area?: HTMLElement | Window;
  /** Onde o arraste não vira pintura (padrão: textos, links, imagens e campos). */
  readonly ignorar?: string;
  /** Chamado a cada trecho novo, para quem desenha acordar. */
  readonly aoPintar?: () => void;
}

export function instalarPintura(canvas: HTMLCanvasElement, { area = window, ignorar = CONTEUDO, aoPintar }: Opcoes = {}) {
  let activePointer = -1;
  let stroke = 0;
  let last: [number, number] = [0.5, 0.5];
  let pending: { from: [number, number]; to: [number, number]; stroke: number } | undefined;

  const point = (event: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))),
    ];
  };

  const extend = (from: [number, number], to: [number, number]) => {
    if (pending?.stroke === stroke) pending.to = to;
    else pending = { from, to, stroke };
    aoPintar?.();
  };

  const down = (event: Event) => {
    if (!(event instanceof PointerEvent)) return;
    if (!event.isPrimary || activePointer !== -1 || event.button !== 0) return;
    if (event.pointerType === 'touch') return;
    if ((event.target as Element | null)?.closest?.(ignorar)) return;
    // O arraste vira pintura, não seleção do texto por onde ele passar
    event.preventDefault();
    activePointer = event.pointerId;
    stroke++;
    last = point(event);
    extend(last, last);
  };

  const move = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerId !== activePointer) return;
    const next = point(event);
    extend(last, next);
    last = next;
  };

  const up = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerId !== activePointer) return;
    activePointer = -1;
  };

  area.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  return {
    take(): PaintSegment | undefined {
      const segment = pending;
      pending = undefined;
      return segment;
    },
    dispose() {
      area.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      activePointer = -1;
      pending = undefined;
    },
  };
}
