import { useRef } from 'react';
import { Contato } from './Contato';
import { Hero } from './Hero';
import { Projetos } from './Projetos';
import { Sobre } from './Sobre';
import { useGSAP } from './movimento/gsap';
import { orquestrar } from './movimento/orquestrar';
import type { DadosLanding } from './tipos';
import './landing.css';

/** Página inicial. O HTML sai pronto do build (Astro); no navegador, o React assume e a GSAP
 * orquestra as animações a partir de um ponto só (movimento/orquestrar.ts). */
export default function Landing(d: DadosLanding) {
  const raiz = useRef<HTMLDivElement>(null);
  useGSAP(() => (raiz.current ? orquestrar(raiz.current) : undefined), { scope: raiz });

  return (
    <div ref={raiz} className="landing">
      <Hero nome={d.nome} cargo={d.cargo} empresa={d.empresa} cidade={d.cidade} chamada={d.chamada} foto={d.foto} />
      <Projetos projetos={d.projetos} arquivados={d.arquivados} />
      <Sobre
        declaracao={d.declaracao}
        bio={d.bio}
        fatos={d.fatos}
        stack={d.stack}
        extras={d.extras}
        cidade={d.cidade}
      />
      <Contato linkedin={d.linkedin} github={d.github} />
    </div>
  );
}
