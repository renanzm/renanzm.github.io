import { useEffect, useRef } from 'react';
import { Assinatura } from './Assinatura';
import type { Foto } from './tipos';

// Com object-fit: cover, a foto (proporção 1,77) ocupa 90% da altura da tela; em telas mais
// "altas" que 1,59 ela é desenhada pela altura, mais larga que a tela
const TAMANHOS = '(max-aspect-ratio: 159/100) 159vh, 100vw';

interface Props {
  nome: string;
  cargo: string;
  empresa: string;
  cidade: string;
  chamada: string;
  foto: Foto;
}

/** Liga os riscos de luz no fundo da abertura (WebGPU): arrastar o mouse no fundo risca uma
 * linha de luz que apaga sozinha. Só em navegador com WebGPU e sem "reduzir movimento"; sem eles,
 * o fundo fica preto como na foto. */
function useRiscosDeLuz(
  hero: React.RefObject<HTMLElement | null>,
  luz: React.RefObject<HTMLCanvasElement | null>,
  riscos: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const area = hero.current;
    const canvas = luz.current;
    const tinta = riscos.current;
    if (!area || !canvas || !tinta) return;
    if (!('gpu' in navigator) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mounted = true;
    let dispose: (() => void) | undefined;
    import('../efeitos/radiancia/riscos-de-luz')
      .then(({ criarRiscosDeLuz }) => {
        if (!mounted) return;
        const efeito = criarRiscosDeLuz({ canvas, tinta, area });
        dispose = efeito.dispose;
        return efeito.ready.then(() => mounted && area.classList.add('com-riscos'));
      })
      .catch((cause: unknown) => {
        if (mounted) console.warn('Riscos de luz indisponíveis; a abertura segue sem eles.', cause);
      });
    return () => {
      mounted = false;
      area.classList.remove('com-riscos');
      dispose?.();
    };
  }, [hero, luz, riscos]);
}

/** Abertura: o retrato e a assinatura, em camadas que se movem em velocidades diferentes na
 * rolagem. Atrás do busto recortado, o fundo onde o visitante risca luz. */
export function Hero({ nome, cargo, empresa, cidade, chamada, foto }: Props) {
  const hero = useRef<HTMLElement>(null);
  const luz = useRef<HTMLCanvasElement>(null);
  const riscos = useRef<HTMLCanvasElement>(null);
  useRiscosDeLuz(hero, luz, riscos);

  return (
    <section ref={hero} className="hero" id="inicio" aria-labelledby="hero-nome">
      <canvas ref={luz} className="hero-camada hero-luz" aria-hidden="true" />
      <canvas ref={riscos} className="hero-camada hero-riscos" aria-hidden="true" />
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
