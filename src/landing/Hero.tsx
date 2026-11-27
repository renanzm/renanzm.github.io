import { useEffect, useRef } from 'react';
import { Assinatura } from './Assinatura';
import type { Foto } from './tipos';

// Com object-fit: cover, a foto (proporção 1,77) ocupa 94% da altura da tela; em telas mais
// "altas" que 1,66 ela é desenhada pela altura, mais larga que a tela
const TAMANHOS = '(max-aspect-ratio: 166/100) 166vh, 100vw';

interface Props {
  nome: string;
  cargo: string;
  empresa: string;
  cidade: string;
  chamada: string;
  foto: Foto;
}

/** Liga o oceano de partículas no fundo da abertura (WebGPU, adaptado do exemplo "Particles
 * ocean" do vgpu; ver efeitos/oceano). Só em navegador com WebGPU e sem "reduzir movimento"; sem
 * eles, o fundo fica preto como na foto. */
function useOceano(oceano: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = oceano.current;
    if (!canvas) return;
    if (!('gpu' in navigator) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mounted = true;
    let dispose: (() => void) | undefined;
    import('../efeitos/oceano/renderer')
      .then(({ criarOceano }) => {
        if (!mounted) return;
        const efeito = criarOceano({ canvas });
        dispose = efeito.dispose;
        return efeito.ready.then(() => mounted && canvas.classList.add('pronto'));
      })
      .catch((cause: unknown) => {
        if (mounted) console.warn('Oceano do fundo indisponível; a abertura segue sem ele.', cause);
      });
    return () => {
      mounted = false;
      canvas.classList.remove('pronto');
      dispose?.();
    };
  }, [oceano]);
}

/** Abertura: o retrato e a assinatura, em camadas que se movem em velocidades diferentes na
 * rolagem. Atrás do busto recortado, o oceano de partículas. */
export function Hero({ nome, cargo, empresa, cidade, chamada, foto }: Props) {
  const hero = useRef<HTMLElement>(null);
  const oceano = useRef<HTMLCanvasElement>(null);
  useOceano(oceano);

  return (
    <section ref={hero} className="hero" id="inicio" aria-labelledby="hero-nome">
      <canvas ref={oceano} className="hero-camada hero-oceano" aria-hidden="true" />
      <div className="hero-camada hero-foto">
        <div className="hero-camada hero-foto-intro">
          <div className="hero-busto">
            <div className="hero-busto-halo" aria-hidden="true" />
            <picture>
              <source type="image/avif" srcSet={foto.srcsetAvif} sizes={TAMANHOS} />
              <source type="image/webp" srcSet={foto.srcsetWebp} sizes={TAMANHOS} />
              <img
                src={foto.src}
                alt={foto.alt}
                width={foto.largura}
                height={foto.altura}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </picture>
            <div className="hero-busto-brilho" aria-hidden="true">
              <span className="hero-busto-faixa" />
            </div>
            <div className="hero-camada hero-gradiente" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="hero-camada hero-escuro" aria-hidden="true" />
      <div className="hero-camada hero-veu" aria-hidden="true" />

      <div className="hero-assinatura">
        <h1 id="hero-nome" className="m-0">
          <span className="sr-only">{nome}</span>
          <Assinatura />
        </h1>
      </div>

      <div className="hero-camada hero-texto">
        <div className="container hero-texto-grade">
          <p className="hero-chamada m-0 max-w-[21rem] text-[0.95rem] leading-relaxed text-texto-2" data-intro>
            {chamada}
          </p>
          <div className="hero-base">
            <p className="rotulo m-0 text-texto-2" data-intro>
              {cargo}
              <span className="text-apagado"> · {empresa}</span>
            </p>
            <a className="hero-rolar rotulo" href="#projetos" data-intro>
              <span>Role</span>
              <span className="hero-rolar-linha" aria-hidden="true" />
            </a>
            <p className="rotulo m-0 text-right text-texto-2" data-intro>
              {cidade}
              <span className="text-apagado"> · Brasil</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
