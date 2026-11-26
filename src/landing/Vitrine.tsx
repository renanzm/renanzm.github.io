import type { CSSProperties } from 'react';
import svgFocus from '../assets/projetos/focus-temp-tool.svg?raw';
import type { ProjetoCartao } from './tipos';

const dois = (n: number) => String(n).padStart(2, '0');

interface Props {
  projeto: ProjetoCartao;
  indice: number;
  total: number;
}

/** Um projeto em tela cheia. No desktop, cada um sobe como um cartão por cima do anterior. */
export function Vitrine({ projeto: p, indice, total }: Props) {
  const invertida = indice % 2 === 1;
  const proporcao = p.midia ? `${p.midia.largura} / ${p.midia.altura}` : undefined;
  const encaixe = !p.midia ? 'conter' : p.midia.tipo === 'video' ? 'com-video' : p.midia.encaixe;
  const externo = p.acao.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <section
      className={`vitrine ${invertida ? 'invertida' : ''}`}
      id={p.id}
      style={{ '--c': p.cor } as CSSProperties}
      aria-labelledby={`titulo-${p.id}`}
      data-vitrine
    >
      <span className="vitrine-numero" aria-hidden="true">
        {dois(indice + 1)}
      </span>
      <div className="container grade">
        <div className="info flex max-w-xl flex-col gap-5">
          <div className="flex items-center gap-5">
            <span className="rotulo">
              {dois(indice + 1)} / {dois(total)}
            </span>
            <span className="status">{p.status}</span>
          </div>
          <h2 id={`titulo-${p.id}`} className="vitrine-titulo" data-dividir>
            {p.titulo}
          </h2>
          <p className="m-0 text-lead text-texto">{p.resumo}</p>
          {p.descricao && <p className="vitrine-descricao m-0 text-texto-2">{p.descricao}</p>}
          {p.destaques.length > 0 && (
            <ul className="destaques m-0 grid list-none gap-2.5 p-0">
              {p.destaques.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1.5">
            {p.chips.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2.5">
            <a className="btn btn-solido" href={p.acao.url} data-magnetico {...externo}>
              {p.acao.rotulo}
            </a>
            {p.acao.url !== p.pagina && (
              <a className="btn" href={p.pagina}>
                Detalhes{' '}
                <span className="seta seta-direita" aria-hidden="true">
                  →
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="palco3d">
          <a
            className={`midia moldura ${encaixe}`}
            style={proporcao ? { aspectRatio: proporcao } : undefined}
            href={p.pagina}
            tabIndex={-1}
            aria-hidden="true"
            data-inclina
          >
            {p.midia?.tipo === 'video' ? (
              <>
                <video
                  className="video"
                  src={p.midia.src}
                  poster={p.midia.poster}
                  width={p.midia.largura}
                  height={p.midia.altura}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  data-video
                />
                {p.id === 'focus-temp-tool' && (
                  <div className="mostrador-mini" dangerouslySetInnerHTML={{ __html: svgFocus }} />
                )}
              </>
            ) : p.id === 'focus-temp-tool' ? (
              <div className="mostrador" dangerouslySetInnerHTML={{ __html: svgFocus }} />
            ) : p.midia?.tipo === 'imagem' ? (
              <img
                src={p.midia.src}
                srcSet={p.midia.srcset}
                sizes="(min-width: 960px) 760px, 100vw"
                alt=""
                width={p.midia.largura}
                height={p.midia.altura}
                loading={indice === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ) : (
              <span className="sem-capa">{p.titulo}</span>
            )}
            {p.teaser && <span className="selo mono">em breve</span>}
          </a>
        </div>
      </div>
    </section>
  );
}
