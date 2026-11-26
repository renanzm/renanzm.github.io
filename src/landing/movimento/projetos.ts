/* Abertura saindo de cena e projetos entrando, ligados à rolagem.
 * Desktop: a abertura fica fixa e cada projeto sobe como um cartão por cima do anterior.
 * Celular: tudo rola normalmente, com revelações simples. */
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { CABECALHO, CURVA, DURACAO, INTERVALO, PAUSA } from './ritmo';

const pausaPx = () => innerHeight * PAUSA;

/** Um elemento fixado pelo ScrollTrigger fica dentro de um .pin-spacer, que guarda a posição real. */
export const posicaoReal = (el: HTMLElement): HTMLElement =>
  el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;

/** Altura do espaço de pausa logo depois da seção (o div .pausa). */
function alturaDaPausa(secao: HTMLElement): number {
  const depois = posicaoReal(secao).nextElementSibling as HTMLElement | null;
  return depois?.classList.contains('pausa') ? depois.offsetHeight : 0;
}

/** Parallax em camadas: a foto mal se move, a assinatura sobe mais rápido e os textos, mais ainda.
 * Os textos somem na primeira metade do trajeto, antes de cruzar o cabeçalho. */
function saidaDaAbertura(hero: HTMLElement, gatilho: ScrollTrigger.Vars) {
  const q = gsap.utils.selector(hero);
  gsap
    .timeline({ scrollTrigger: { ...gatilho, invalidateOnRefresh: true }, defaults: { ease: CURVA.rolagem, duration: 1 } })
    .to(q('.hero-foto'), { yPercent: -7, scale: 1.08 }, 0)
    .to(q('.hero-escuro'), { opacity: 0.82 }, 0)
    .to(q('.hero-assinatura'), { y: () => -innerHeight * 0.3, rotation: -3, opacity: 0, duration: 0.8 }, 0)
    .to(q('.hero-texto'), { y: () => -innerHeight * 0.22, opacity: 0, duration: 0.5 }, 0);
}

/** Título que sobe linha por linha de dentro de uma máscara. Refaz as linhas se a largura mudar. */
function tituloEmLinhas(titulo: Element | null, animar: (linhas: Element[]) => gsap.core.Animation) {
  if (!titulo) return;
  SplitText.create(titulo, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit: (s) => animar(s.lines),
  });
}

/* ------------------------------------------------ desktop: projetos empilhados */
export function projetosEmPilha(raiz: HTMLElement) {
  const hero = raiz.querySelector<HTMLElement>('.hero');
  const secoes = gsap.utils.toArray<HTMLElement>('[data-vitrine]', raiz);
  if (!hero || !secoes.length) return;
  const topo = `top ${CABECALHO}px`;

  // 1. Fixações primeiro. As durações saem das alturas, sem medir seções que o próprio
  //    ScrollTrigger desloca (medir assim erra quando a página abre já rolada).
  // A abertura fica parada até o primeiro projeto chegar ao topo
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${hero.offsetHeight - CABECALHO}`,
    pin: true,
    pinSpacing: false,
  });
  secoes.forEach((secao, i) => {
    const ultima = i === secoes.length - 1;
    ScrollTrigger.create({
      trigger: secao,
      start: topo,
      // Parada durante a pausa e enquanto o próximo projeto sobe por cima; a última, só na pausa
      end: () => `+=${ultima ? pausaPx() : secao.offsetHeight + alturaDaPausa(secao)}`,
      pin: true,
      pinSpacing: ultima,
    });
  });

  // 2. Animações, medidas pelo pin-spacer de cada seção (ele fica parado no lugar dela)
  const lugares = secoes.map(posicaoReal);
  saidaDaAbertura(hero, { trigger: lugares[0], start: 'top bottom', end: topo, scrub: true });

  secoes.forEach((secao, i) => {
    const lugar = lugares[i];
    const proximo = lugares[i + 1];
    const subindo: ScrollTrigger.Vars = { trigger: lugar, start: 'top 82%', end: `top ${CABECALHO + 32}px`, scrub: true };

    // Entrada: o conteúdo se monta enquanto o cartão sobe
    tituloEmLinhas(secao.querySelector('[data-dividir]'), (linhas) =>
      gsap.from(linhas, { yPercent: 115, stagger: 0.15, ease: CURVA.rolagem, scrollTrigger: { ...subindo } }),
    );
    gsap.from(secao.querySelectorAll('.info > :not([data-dividir])'), {
      y: 52,
      opacity: 0,
      stagger: 0.06,
      ease: CURVA.rolagem,
      scrollTrigger: { ...subindo },
    });
    gsap.from(secao.querySelector('.palco3d'), {
      scale: 1.12,
      opacity: 0,
      ease: CURVA.rolagem,
      scrollTrigger: { trigger: lugar, start: 'top bottom', end: topo, scrub: true },
    });
    // O número gigante corre atrás do conteúdo, mais devagar que ele
    gsap.fromTo(
      secao.querySelector('.vitrine-numero'),
      { yPercent: 40 },
      {
        yPercent: -30,
        ease: CURVA.rolagem,
        scrollTrigger: {
          trigger: lugar,
          start: 'top bottom',
          end: () => `+=${innerHeight + secao.offsetHeight + alturaDaPausa(secao)}`,
          scrub: true,
        },
      },
    );

    // Saída: o cartão recua e escurece enquanto o próximo projeto sobe por cima
    if (proximo) {
      gsap.to(secao.querySelector('.grade'), {
        scale: 0.9,
        rotationX: -7,
        transformPerspective: 1400,
        transformOrigin: '50% 0%',
        opacity: 0.12,
        ease: CURVA.rolagem,
        scrollTrigger: { trigger: proximo, start: 'top bottom', end: topo, scrub: true },
      });
    }

    efeitosDaPausa(secao, { trigger: lugar, start: topo, end: () => `+=${pausaPx()}`, scrub: true });
  });
}

/* ------------------------------------------------- celular: revelações simples */
export function projetosSimples(raiz: HTMLElement) {
  const hero = raiz.querySelector<HTMLElement>('.hero');
  if (hero) saidaDaAbertura(hero, { trigger: hero, start: 'top top', end: 'bottom top', scrub: true });

  gsap.utils.toArray<HTMLElement>('[data-vitrine]', raiz).forEach((secao) => {
    const aoChegar: ScrollTrigger.Vars = { trigger: secao, start: 'top 78%', once: true };
    tituloEmLinhas(secao.querySelector('[data-dividir]'), (linhas) =>
      gsap.from(linhas, {
        yPercent: 115,
        duration: DURACAO.media,
        ease: CURVA.entrada,
        stagger: INTERVALO.linhas,
        scrollTrigger: { ...aoChegar },
      }),
    );
    gsap.from(secao.querySelectorAll('.palco3d, .info > :not([data-dividir])'), {
      y: 40,
      opacity: 0,
      duration: DURACAO.media,
      ease: CURVA.entrada,
      stagger: 0.06,
      scrollTrigger: { ...aoChegar },
    });
    efeitosDaPausa(secao, { trigger: secao, start: 'top 75%', end: 'center 35%', scrub: true });
  });
}

/* ------------------------------- efeitos de cada projeto enquanto está parado */
function efeitosDaPausa(secao: HTMLElement, gatilho: ScrollTrigger.Vars) {
  if (secao.id === 'sound-mod-rs') {
    // As cores neon do app passam pela seção
    gsap
      .timeline({ scrollTrigger: gatilho, defaults: { ease: CURVA.rolagem } })
      .to(secao, { '--c': '#22d3ee' })
      .to(secao, { '--c': '#a3e635' })
      .to(secao, { '--c': '#facc15' })
      .to(secao, { '--c': '#f472b6' });
    return;
  }
  if (secao.id === 'focus-temp-tool') {
    // O motor esquenta: o ponteiro real sai do frio e a luz azul se apaga
    const agulha = secao.querySelector('.agulha-real');
    const luz = secao.querySelector('.luz-fria');
    const tl = gsap.timeline({ scrollTrigger: gatilho, defaults: { ease: CURVA.rolagem } });
    if (agulha) tl.fromTo(agulha, { attr: { transform: 'rotate(-206)' } }, { attr: { transform: 'rotate(-98)' } }, 0);
    if (luz) tl.fromTo(luz, { opacity: 1 }, { opacity: 0.12 }, 0);
    return;
  }
  // Nos outros, a imagem se aproxima devagar
  const imagem = secao.querySelector('.midia img');
  if (imagem) gsap.fromTo(imagem, { scale: 1 }, { scale: 1.06, ease: CURVA.rolagem, scrollTrigger: gatilho });
}
