/* Abertura: a luz do retrato acende, a câmera assenta, a assinatura é escrita e só então
 * a interface aparece. Uma linha do tempo só, tocada uma vez ao carregar. */
import { gsap } from './gsap';
import { apagar, escrever } from './assinatura';
import { CURVA, DURACAO, INTERVALO } from './ritmo';

export function abertura(raiz: HTMLElement) {
  const hero = raiz.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  const q = gsap.utils.selector(hero);
  const assinatura = hero.querySelector('.assinatura');
  // O cabeçalho fica fora da ilha React: busca no documento, não no escopo do useGSAP
  const itensDoTopo = document.querySelectorAll('.topo [data-topo-item]');
  const soltar = { clearProps: 'transform,opacity' };

  apagar(assinatura);
  const tl = gsap
    .timeline({ defaults: { ease: CURVA.entrada } })
    // 1. Luz e câmera
    .fromTo(q('.hero-veu'), { opacity: 1 }, { opacity: 0, duration: DURACAO.luz, ease: CURVA.suave }, 0)
    .fromTo(q('.hero-foto-intro'), { scale: 1.14 }, { scale: 1, duration: 3.2 }, 0)
    // 2. A assinatura, enquanto a luz termina de subir
    .add(escrever(assinatura), 0.8)
    // 3. A interface, por último: primeiro o cabeçalho, depois os textos da abertura
    .fromTo(
      itensDoTopo,
      { y: -14, opacity: 0 },
      { y: 0, opacity: 1, duration: DURACAO.media, stagger: INTERVALO.itens, ...soltar },
      1.5,
    )
    .fromTo(
      q('[data-intro]'),
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: DURACAO.longa, stagger: 0.1, ...soltar },
      1.8,
    );
  if (import.meta.env.DEV) Object.assign(window, { abertura: tl });

  // Os estados iniciais já foram aplicados pela GSAP: o CSS que escondia a abertura pode sair
  document.documentElement.classList.remove('vai-animar');
}
