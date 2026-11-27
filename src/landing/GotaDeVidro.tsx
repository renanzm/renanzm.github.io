import { useEffect, useRef } from 'react';

/** Gota d'água de vidro flutuando ao lado da declaração do "Sobre" (WebGPU, adaptada do exemplo
 * "Glass Sculpture" do vgpu; ver efeitos/gota). A luz segue o cursor, e arrastar com o mouse gira
 * a gota.
 *
 * Só em telas largas (ao lado do texto; no celular não há espaço), com WebGPU e sem "reduzir
 * movimento". O vgpu e os shaders só são baixados quando a seção chega perto da tela; sem WebGPU,
 * o espaço fica vazio, preto como a página. */
export function GotaDeVidro() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !('gpu' in navigator)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!matchMedia('(min-width: 1024px)').matches) return;
    let mounted = true;
    let dispose: (() => void) | undefined;
    const iniciar = () =>
      import('../efeitos/gota/renderer')
        .then(({ criarGota }) => {
          if (!mounted) return;
          const gota = criarGota(canvas);
          dispose = gota.dispose;
          return gota.ready.then(() => mounted && canvas.classList.add('pronto'));
        })
        .catch((cause: unknown) => {
          if (mounted) console.warn('Gota de vidro indisponível; o espaço fica vazio.', cause);
        });
    const perto = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        perto.disconnect();
        void iniciar();
      },
      { rootMargin: '50% 0px' },
    );
    perto.observe(canvas);
    return () => {
      mounted = false;
      perto.disconnect();
      canvas.classList.remove('pronto');
      dispose?.();
    };
  }, []);

  return (
    <div className="gota hidden lg:col-span-4 lg:block" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
