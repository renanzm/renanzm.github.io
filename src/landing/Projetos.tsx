import { Fragment, type CSSProperties } from 'react';
import { Vitrine } from './Vitrine';
import type { DadosLanding } from './tipos';

const dois = (n: number) => String(n).padStart(2, '0');

type Props = Pick<DadosLanding, 'projetos' | 'arquivados'>;

export function Projetos({ projetos, arquivados }: Props) {
  return (
    <>
      <div id="projetos">
        <h2 className="sr-only">Projetos</h2>
        {projetos.map((p, i) => (
          <Fragment key={p.id}>
            <Vitrine projeto={p} indice={i} total={projetos.length} />
            {/* Espaço transparente: o projeto fica parado à vista antes do próximo subir */}
            {i < projetos.length - 1 && <div className="pausa" aria-hidden="true" />}
          </Fragment>
        ))}
      </div>

      <nav className="trilha" aria-label="Atalhos para os projetos">
        <ol>
          {projetos.map((p, i) => (
            <li key={p.id}>
              <a href={`#${p.id}`} data-alvo={p.id} style={{ '--c': p.cor } as CSSProperties}>
                <span className="trilha-nome">{p.titulo}</span>
                <span className="trilha-num">{dois(i + 1)}</span>
                <span className="trilha-traco" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {arquivados.length > 0 && (
        <div className="arquivo container flex flex-wrap items-baseline gap-x-6 gap-y-2.5 py-7 text-[0.92rem]">
          <span className="rotulo">Arquivo</span>
          {arquivados.map((p) => (
            <a key={p.id} href={`/projetos/${p.id}`} className="no-underline">
              {p.titulo}
              <span className="text-apagado"> · {p.resumo}</span>
            </a>
          ))}
          <a href="/projetos" className="ml-auto text-texto-2 no-underline">
            Índice de projetos <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </>
  );
}
