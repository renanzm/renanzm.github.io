import { Assinatura } from './Assinatura';
import type { Foto } from './tipos';

// Com object-fit: cover, numa tela mais "alta" que a foto (16:9), ela é desenhada pela altura
const TAMANHOS = '(max-aspect-ratio: 16/9) 177vh, 100vw';

interface Props {
  nome: string;
  cargo: string;
  empresa: string;
  cidade: string;
  chamada: string;
  foto: Foto;
}

/** Abertura: o retrato em tela cheia e a assinatura, em camadas que se movem em velocidades
 * diferentes na rolagem (foto ao fundo, assinatura no meio, textos na frente). */
export function Hero({ nome, cargo, empresa, cidade, chamada, foto }: Props) {
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-nome">
      <div className="hero-camada hero-foto">
        <div className="hero-camada hero-foto-intro">
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
        </div>
      </div>
      <div className="hero-camada hero-gradiente" aria-hidden="true" />
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
