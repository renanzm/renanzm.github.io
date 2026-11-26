import { useEffect, useRef } from 'react';

/** Foil holográfico em WebGPU por cima da prévia de um projeto (adaptado do exemplo "Holographic
 * Card" do vgpu; ver holografico/renderer.ts). Aparece quando o cursor se aproxima da moldura.
 *
 * O vgpu só é baixado em navegador com WebGPU. Sem WebGPU, ou se a GPU falhar ao iniciar, o canvas
 * fica vazio (invisível) e a moldura continua com a luz em CSS de antes. */
export function CartaoHolografico() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const moldura = canvas?.parentElement;
    const area = canvas?.closest<HTMLElement>('[data-vitrine]');
    if (!canvas || !moldura || !area || !('gpu' in navigator)) return;
    let mounted = true;
    let dispose: (() => void) | undefined;
    const iniciar = () =>
      import('./holografico/renderer')
        .then(({ criarCartaoHolografico }) => {
          if (!mounted) return;
          const renderer = criarCartaoHolografico(canvas, area);
          dispose = renderer.dispose;
          return renderer.ready.then(() => {
            // O foil assume a luz da moldura: a de CSS sai para não somar as duas
            if (mounted) moldura.classList.add('holo-ativo');
          });
        })
        .catch((cause: unknown) => {
          if (mounted) console.warn('Cartão holográfico indisponível; a moldura fica com a luz em CSS.', cause);
        });
    // A GPU só entra em cena quando o projeto chega perto da tela: quem não rola até ele não
    // paga o canvas, o pipeline nem o download do vgpu
    const perto = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        perto.disconnect();
        void iniciar();
      },
      { rootMargin: '50% 0px' },
    );
    perto.observe(canvas);
    return () => {
      mounted = false;
      perto.disconnect();
      dispose?.();
      moldura.classList.remove('holo-ativo');
    };
  }, []);

  return <canvas ref={ref} className="holo" aria-hidden="true" />;
}
