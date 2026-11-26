/* Abertura: a luz do retrato acende, a câmera assenta, a assinatura é escrita e só então
 * a interface aparece. Uma linha do tempo só, tocada uma vez ao carregar. */
import { gsap } from './gsap';
import { apagar, escrever } from './assinatura';
import { CURVA, DURACAO, INTERVALO } from './ritmo';

/** Inclinação da faixa de brilho, em graus (a mesma do CSS de .hero-busto-faixa). */
const INCLINACAO = 12;
/** Quanto a faixa inclinada avança além da própria largura, de cada lado. */
const sobraDaFaixa = (el: HTMLElement) => (el.offsetHeight / 2) * Math.tan((INCLINACAO * Math.PI) / 180);

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
    // Um brilho rápido atravessa o busto quando a luz já subiu o bastante para ele aparecer.
    // A faixa sai de fora pela esquerda e termina fora pela direita, medida em px: inclinada, ela
    // passa da própria largura em metade da altura × tan(12°), e isso muda com a proporção da tela
    .fromTo(
      q('.hero-busto-faixa'),
      { x: (_: number, el: HTMLElement) => -(el.offsetWidth + sobraDaFaixa(el)), xPercent: 0, skewX: -INCLINACAO },
      {
        x: (_: number, el: HTMLElement) => (el.parentElement?.offsetWidth ?? 0) + sobraDaFaixa(el),
        xPercent: 0,
        skewX: -INCLINACAO,
        // Devagar o bastante para ser visto: a faixa leva quase um segundo para cruzar o rosto
        duration: 1.8,
        ease: 'sine.inOut',
      },
      1.25,
    )
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
