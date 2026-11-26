/* Maestro da página inicial: decide o que anima, em que ordem e em quais telas.
 * Roda dentro do useGSAP, então tudo o que a GSAP cria aqui é desfeito junto com o componente. */
import { gsap, ScrollTrigger } from './gsap';
import { abertura } from './abertura';
import { modoEstatico } from './estatico';
import { magneticos } from './magnetico';
import { estadoDaRolagem, irParaAncoraInicial, rolagemSuave } from './navegacao';
import { projetosEmPilha, projetosSimples } from './projetos';
import { contato, sobre } from './secoes';
import { iniciarInclinacao } from '../../scripts/inclinacao';

export function orquestrar(raiz: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return modoEstatico(raiz);

  ScrollTrigger.config({ ignoreMobileResize: true });
  const { lenis, parar } = rolagemSuave();

  // Uma vez só, em qualquer tela
  abertura(raiz);
  iniciarInclinacao(raiz);
  const soltarMagneticos = magneticos(raiz);

  // Na ordem da página: as fixações de cima precisam existir antes de medir as de baixo
  const mm = gsap.matchMedia();
  mm.add(
    {
      pilha: '(min-width: 960px) and (min-height: 640px)',
      simples: '(max-width: 959px), (max-height: 639px)',
    },
    (ctx) => {
      const { pilha } = ctx.conditions as { pilha: boolean };
      document.documentElement.classList.toggle('pilha', pilha);
      if (pilha) projetosEmPilha(raiz);
      else projetosSimples(raiz);
      sobre(raiz);
      contato(raiz);
      const desfazerEstado = estadoDaRolagem(raiz);
      return () => {
        desfazerEstado?.();
        document.documentElement.classList.remove('pilha');
      };
    },
  );

  const desfazerAncora = irParaAncoraInicial(lenis);

  return () => {
    desfazerAncora();
    soltarMagneticos();
    mm.revert();
    parar();
  };
}
