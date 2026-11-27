import { Fragment } from 'react';
import { GotaDeVidro } from './GotaDeVidro';
import type { DadosLanding } from './tipos';

type Props = Pick<DadosLanding, 'declaracao' | 'bio' | 'fatos' | 'stack' | 'extras' | 'cidade'>;

/** "Dados que *não podem* dar errado." → palavras soltas, com as do meio dos asteriscos em itálico.
 * Pontuação sozinha (o ponto depois de um trecho em itálico) gruda na palavra anterior. */
function palavras(frase: string) {
  return frase.split('*').flatMap((trecho, i) =>
    trecho
      .split(' ')
      .filter(Boolean)
      .map((palavra, j) => ({ palavra, enfase: i % 2 === 1, colada: j === 0 && /^[.,;:!?]+$/.test(palavra) })),
  );
}

export function Sobre({ declaracao, bio, fatos, stack, extras, cidade }: Props) {
  const lista = palavras(declaracao);
  return (
    <section id="sobre" className="sobre relative border-t border-linha pt-28 pb-24 lg:pt-40 lg:pb-32">
      <div className="container">
        <div className="flex items-center justify-between border-b border-linha pb-4">
          <p className="rotulo m-0">— Sobre</p>
          <p className="rotulo m-0">{cidade}</p>
        </div>

        {/* A declaração e, ao lado dela em telas largas, a gota de vidro */}
        <div className="mt-14 mb-16 lg:mt-20 lg:mb-24 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10">
          <h2 className="declaracao m-0 max-w-[17ch] text-[clamp(2.4rem,1.2rem+4vw,4.8rem)] leading-[0.98] font-medium tracking-[-0.045em] lg:col-span-8">
            <span className="sr-only">{declaracao.replaceAll('*', '')}</span>
            <span aria-hidden="true">
              {lista.map(({ palavra, enfase, colada }, i) => (
                <Fragment key={i}>
                  {i > 0 && !colada && ' '}
                  <span className={`pal ${enfase ? 'serif' : ''}`}>{palavra}</span>
                </Fragment>
              ))}
            </span>
          </h2>
          <GotaDeVidro />
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="bio lg:col-span-7">
            {bio.map((paragrafo, i) => (
              <p
                key={i}
                className={`mt-0 mb-5 text-[1.08rem] leading-[1.75] ${i === 0 ? 'text-texto' : 'text-texto-2'}`}
                data-linhas
              >
                {paragrafo}
              </p>
            ))}
          </div>
          <dl className="fatos m-0 grid content-start lg:col-span-5">
            {fatos.map((f) => (
              <div key={f.rotulo} className="fato">
                <dt className="rotulo">{f.rotulo}</dt>
                <dd className="m-0 text-texto">{f.valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="stack mt-24">
          <div className="flex items-center justify-between border-b border-linha pb-4">
            <p className="rotulo m-0">— Stack</p>
            <p className="rotulo m-0">{String(stack.length).padStart(2, '0')} ferramentas</p>
          </div>
          <ul className="icones mt-6 mb-5 grid list-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 p-0">
            {stack.map((s) => (
              <li key={s.id} className="icone">
                <img src={`/stack/${s.id}.svg`} alt="" width={40} height={40} loading="lazy" />
                <span>{s.nome}</span>
              </li>
            ))}
          </ul>
          <ul className="extras m-0 flex list-none flex-wrap gap-2 p-0">
            {extras.map((e) => (
              <li key={e} className="chip">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
