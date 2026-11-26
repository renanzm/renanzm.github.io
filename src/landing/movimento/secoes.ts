/* "Sobre" e "Contato": textos que se revelam na ordem de leitura e a assinatura de novo no fim. */
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { apagar, escrever } from './assinatura';
import { CURVA, DURACAO, INTERVALO } from './ritmo';

/** Parágrafos que sobem linha por linha quando chegam à tela. */
function linhasAoChegar(alvos: Element[], gatilho: Element | null) {
  if (!alvos.length || !gatilho) return;
  SplitText.create(alvos, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    // Parágrafos continuam lidos como texto corrido pelos leitores de tela
    aria: 'none',
    onSplit: (s) =>
      gsap.from(s.lines, {
        yPercent: 105,
        duration: DURACAO.media,
        ease: CURVA.entrada,
        stagger: INTERVALO.linhas,
        scrollTrigger: { trigger: gatilho, start: 'top 82%', once: true },
      }),
  });
}

export function sobre(raiz: HTMLElement) {
  const q = gsap.utils.selector(raiz);
  const declaracao = raiz.querySelector('.declaracao');

  // A frase acende palavra por palavra no ritmo da leitura (presa à rolagem)
  gsap.fromTo(
    q('.declaracao .pal'),
    { opacity: 0.14 },
    {
      opacity: 1,
      stagger: 0.1,
      ease: CURVA.rolagem,
      scrollTrigger: { trigger: declaracao, start: 'top 82%', end: 'bottom 42%', scrub: true },
    },
  );

  linhasAoChegar(q('.bio [data-linhas]'), raiz.querySelector('.bio'));

  // Fatos: a régua de cada linha se desenha e o texto sobe logo atrás
  gsap
    .timeline({ scrollTrigger: { trigger: raiz.querySelector('.fatos'), start: 'top 82%', once: true } })
    .from(q('.fato'), { '--regua': 0, duration: DURACAO.longa, ease: CURVA.entrada, stagger: 0.09 })
    .from(q('.fato > *'), { yPercent: 70, opacity: 0, duration: DURACAO.media, ease: CURVA.entrada, stagger: 0.045 }, 0.12);

  gsap.from(q('.icone'), {
    y: 32,
    opacity: 0,
    duration: 0.8,
    ease: 'back.out(1.6)',
    stagger: { each: 0.035, from: 'start' },
    scrollTrigger: { trigger: raiz.querySelector('.icones'), start: 'top 86%', once: true },
  });
  gsap.from(q('.extras li'), {
    y: 10,
    opacity: 0,
    duration: DURACAO.curta,
    ease: CURVA.entrada,
    stagger: 0.02,
    scrollTrigger: { trigger: raiz.querySelector('.extras'), start: 'top 94%', once: true },
  });
}

export function contato(raiz: HTMLElement) {
  const q = gsap.utils.selector(raiz);
  const secao = raiz.querySelector('.contato');
  const titulo = raiz.querySelector('.contato-titulo');

  // Letras sobem de dentro das linhas enquanto a seção entra
  if (titulo) {
    SplitText.create(titulo, {
      type: 'lines,chars',
      mask: 'lines',
      autoSplit: true,
      onSplit: (s) =>
        gsap.from(s.chars, {
          yPercent: 120,
          rotation: 8,
          transformOrigin: '0% 100%',
          stagger: 0.035,
          ease: CURVA.rolagem,
          scrollTrigger: { trigger: secao, start: 'top 88%', end: 'top 30%', scrub: true },
        }),
    });
  }

  linhasAoChegar(q('.contato [data-linhas]'), secao);
  gsap.from(q('.contato .btn'), {
    y: 24,
    opacity: 0,
    duration: DURACAO.media,
    ease: CURVA.entrada,
    stagger: INTERVALO.itens * 2,
    scrollTrigger: { trigger: secao, start: 'top 60%', once: true },
  });

  // A assinatura é escrita pela própria rolagem: quem rola até o fim assina a página
  const svg = raiz.querySelector('.contato-assinatura .assinatura');
  apagar(svg);
  ScrollTrigger.create({
    trigger: raiz.querySelector('.contato-assinatura'),
    start: 'clamp(top 92%)',
    end: 'clamp(bottom 62%)',
    scrub: 0.8,
    animation: escrever(svg),
  });
}
