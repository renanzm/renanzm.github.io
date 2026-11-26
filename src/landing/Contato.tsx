import { Assinatura } from './Assinatura';

interface Props {
  linkedin: string;
  github: string;
}

/** Fecho da página: o convite e a assinatura de novo, agora escrita pela rolagem. */
export function Contato({ linkedin, github }: Props) {
  return (
    <section id="contato" className="contato relative overflow-clip border-t border-linha pt-28 pb-20 lg:pt-40 lg:pb-28">
      <div className="container">
        <div className="flex items-center justify-between border-b border-linha pb-4">
          <p className="rotulo m-0">— Contato</p>
          <p className="rotulo m-0">LinkedIn · GitHub</p>
        </div>
        <h2 className="contato-titulo mt-14 text-display font-medium lg:mt-20" data-dividir>
          Vamos <span className="serif">conversar?</span>
        </h2>
        <div className="mt-10 grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="m-0 mb-8 max-w-md text-lead text-texto-2" data-linhas>
              Se algum projeto te ajudou ou você quer trocar uma ideia, me chame no LinkedIn.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <a className="btn btn-solido" href={linkedin} target="_blank" rel="noopener noreferrer" data-magnetico>
                Falar no LinkedIn{' '}
                <span className="seta seta-fora" aria-hidden="true">
                  ↗
                </span>
              </a>
              <a className="btn" href={github} target="_blank" rel="noopener noreferrer" data-magnetico>
                Ver o GitHub{' '}
                <span className="seta seta-fora" aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>
          </div>
          <div className="contato-assinatura text-texto lg:col-span-5 lg:col-start-8">
            <Assinatura />
          </div>
        </div>
      </div>
    </section>
  );
}
