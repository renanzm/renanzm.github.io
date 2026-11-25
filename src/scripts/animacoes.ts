/* Animações da página inicial: rolagem suave (Lenis) e animações ligadas à rolagem (GSAP).
 * Quem prefere menos movimento no sistema recebe o site estático, com tudo visível. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const raiz = document.documentElement;
const CABECALHO = 64;
/** Pausa entre um projeto e o próximo, em fração da altura da tela (igual ao CSS de .pausa). */
const PAUSA = 0.35;
const pausaPx = () => innerHeight * PAUSA;

/** Um elemento fixado pelo ScrollTrigger fica dentro de um .pin-spacer, que guarda a posição real. */
const posicaoReal = (el: HTMLElement): HTMLElement =>
  el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;

export function iniciarAnimacoes() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    raiz.classList.remove('vai-animar');
    // Nada toca sozinho: os vídeos ficam no pôster, com controles para quem quiser assistir
    document.querySelectorAll<HTMLVideoElement>('video[data-video]').forEach((v) => (v.controls = true));
    trilhaSimples();
    return;
  }

  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) Object.assign(window, { lenis, ScrollTrigger });

  // Links para âncoras da própria página rolam com a Lenis, respeitando as seções fixadas
  document.addEventListener('click', (ev) => {
    const link = (ev.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const alvo = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!alvo) return;
    ev.preventDefault();
    // A Lenis já desconta o cabeçalho pelo scroll-padding-top do CSS
    lenis.scrollTo(posicaoReal(alvo));
    history.replaceState(null, '', url.hash);
  });

  abertura();

  const mm = gsap.matchMedia();
  mm.add(
    {
      pilha: '(min-width: 960px) and (min-height: 640px)',
      simples: '(max-width: 959px), (max-height: 639px)',
    },
    (ctx) => {
      const { pilha } = ctx.conditions as { pilha: boolean };
      raiz.classList.toggle('pilha', pilha);
      if (pilha) projetosEmPilha();
      else projetosSimples();
      sobreEContato();
      return () => raiz.classList.remove('pilha');
    },
  );

  trilha(lenis);

  // Chegou por um link com #âncora: vai até a seção depois de montar as fixadas e de novo
  // quando fontes e imagens terminam de carregar (mudam as alturas), se a pessoa ainda não rolou
  const alvoInicial = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  let pessoaRolou = false;
  for (const tipo of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    addEventListener(tipo, () => (pessoaRolou = true), { once: true, passive: true });
  }
  const irParaAlvoInicial = () => {
    if (alvoInicial && !pessoaRolou) lenis.scrollTo(posicaoReal(alvoInicial), { immediate: true, force: true });
  };
  const recalcular = () => {
    ScrollTrigger.refresh();
    irParaAlvoInicial();
  };
  if (alvoInicial) recalcular();
  addEventListener('load', recalcular);
  document.fonts?.ready.then(recalcular);
}

/* ------------------------------------------------------------ abertura */
function abertura() {
  // O CSS esconde a abertura até aqui (classe vai-animar); a GSAP assume a partir de agora
  raiz.classList.remove('vai-animar');
  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero .letra', { yPercent: 80, opacity: 0, filter: 'blur(12px)', duration: 1.2, stagger: 0.035 })
    .from('.hero [data-intro]', { y: 28, opacity: 0, duration: 1, stagger: 0.09 }, 0.4)
    .from('.hero-grade', { opacity: 0, scale: 1.15, duration: 2, ease: 'power2.out' }, 0);

  gsap.to('.rolar', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true },
  });
}

/* ------------------------------------------- desktop: projetos empilhados */
function projetosEmPilha() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const secoes = gsap.utils.toArray<HTMLElement>('[data-vitrine]');
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
  const cobrindoAbertura = { trigger: lugares[0], start: 'top bottom', end: topo, scrub: true };
  gsap.to('.hero-conteudo', { scale: 0.9, opacity: 0.1, yPercent: -8, ease: 'none', scrollTrigger: cobrindoAbertura });
  gsap.to('.hero-grade', { scale: 1.35, opacity: 0, ease: 'none', scrollTrigger: { ...cobrindoAbertura } });

  secoes.forEach((secao, i) => {
    const lugar = lugares[i];
    const proximo = lugares[i + 1];

    // Entrada: o conteúdo se monta enquanto a seção sobe
    gsap.from(secao.querySelectorAll('.info > *'), {
      y: 56,
      opacity: 0,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: { trigger: lugar, start: 'top 80%', end: `top ${CABECALHO + 24}px`, scrub: true },
    });
    gsap.from(secao.querySelector('.midia'), {
      scale: 1.14,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: lugar, start: 'top bottom', end: topo, scrub: true },
    });

    // Saída: encolhe e escurece enquanto o próximo projeto sobe por cima
    if (proximo) {
      gsap.to(secao.querySelector('.grade'), {
        scale: 0.88,
        opacity: 0.15,
        ease: 'none',
        scrollTrigger: { trigger: proximo, start: 'top bottom', end: topo, scrub: true },
      });
    }

    efeitosDaPausa(secao, { trigger: lugar, start: topo, end: () => `+=${pausaPx()}`, scrub: true });
  });
}

/** Altura do espaço de pausa logo depois da seção (o div .pausa). */
function alturaDaPausa(secao: HTMLElement): number {
  const depois = posicaoReal(secao).nextElementSibling as HTMLElement | null;
  return depois?.classList.contains('pausa') ? depois.offsetHeight : 0;
}

/* ----------------------------------------------- celular: revelações simples */
function projetosSimples() {
  gsap.to('.hero-conteudo', {
    yPercent: -12,
    opacity: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.utils.toArray<HTMLElement>('[data-vitrine]').forEach((secao) => {
    gsap.from(secao.querySelectorAll('.midia, .info > *'), {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: secao, start: 'top 80%', once: true },
    });
    efeitosDaPausa(secao, { trigger: secao, start: 'top 75%', end: 'center 35%', scrub: true });
  });
}

/* ------------------------------- efeitos de cada projeto enquanto está parado */
function efeitosDaPausa(secao: HTMLElement, gatilho: ScrollTrigger.Vars) {
  if (secao.id === 'sound-mod-rs') {
    // As cores neon do app passam pela seção
    gsap
      .timeline({ scrollTrigger: gatilho, defaults: { ease: 'none' } })
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
    const tl = gsap.timeline({ scrollTrigger: gatilho, defaults: { ease: 'none' } });
    if (agulha) tl.fromTo(agulha, { attr: { transform: 'rotate(-206)' } }, { attr: { transform: 'rotate(-98)' } }, 0);
    if (luz) tl.fromTo(luz, { opacity: 1 }, { opacity: 0.12 }, 0);
    return;
  }
  // Nos outros, a imagem se aproxima devagar
  const imagem = secao.querySelector('.midia img');
  if (imagem) gsap.fromTo(imagem, { scale: 1 }, { scale: 1.06, ease: 'none', scrollTrigger: gatilho });
}

/* ------------------------------------------------------- sobre e contato */
function sobreEContato() {
  gsap.fromTo(
    '.declaracao .pal',
    { opacity: 0.12 },
    {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: '.declaracao', start: 'top 85%', end: 'bottom 45%', scrub: true },
    },
  );
  gsap.from('.bio p, .fatos > div', {
    y: 32,
    opacity: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.sobre-grade', start: 'top 80%', once: true },
  });
  gsap.from('.icones li', {
    y: 30,
    opacity: 0,
    duration: 0.7,
    ease: 'back.out(1.7)',
    stagger: 0.035,
    scrollTrigger: { trigger: '.icones', start: 'top 85%', once: true },
  });
  gsap.from('.extras li', {
    opacity: 0,
    y: 10,
    duration: 0.5,
    stagger: 0.02,
    scrollTrigger: { trigger: '.extras', start: 'top 92%', once: true },
  });
  gsap.from('.contato h2', {
    scale: 0.82,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.contato', start: 'top 95%', end: 'top 40%', scrub: true },
  });
}

/* ------------------------------------------------------------ trilha lateral */
function marcarNaTrilha(id: string) {
  document.querySelectorAll('.trilha a').forEach((a) => {
    if ((a as HTMLElement).dataset.alvo === id) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}

/** Toca só o vídeo do projeto ativo (do começo, quando ele chega) e pausa os outros. */
function tocarSo(id: string | null) {
  document.querySelectorAll<HTMLVideoElement>('[data-vitrine] video[data-video]').forEach((video) => {
    const daSecao = video.closest('[data-vitrine]')?.id === id;
    if (daSecao && video.paused) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else if (!daSecao && !video.paused) {
      video.pause();
    }
  });
}

/** Marca o projeto cuja posição real (pin-spacer) já passou do meio da tela e toca o vídeo dele. */
function trilha(lenis: Lenis) {
  const nav = document.querySelector('.trilha');
  const area = document.getElementById('projetos');
  const secoes = gsap.utils.toArray<HTMLElement>('[data-vitrine]');
  let atual: string | null = null;
  let tocando: string | null = null;
  const atualizar = () => {
    const meio = innerHeight / 2;
    let ativo: string | null = null;
    for (const secao of secoes) if (posicaoReal(secao).getBoundingClientRect().top <= meio) ativo = secao.id;
    if (ativo && ativo !== atual) marcarNaTrilha(ativo);
    atual = ativo;
    let naTela = false;
    if (area) {
      const r = area.getBoundingClientRect();
      naTela = r.top < meio && r.bottom > meio;
      nav?.classList.toggle('visivel', naTela);
    }
    // Fora da área de projetos (abertura, "Sobre"), nenhum vídeo toca
    const deveTocar = naTela ? ativo : null;
    if (deveTocar !== tocando) {
      tocando = deveTocar;
      tocarSo(deveTocar);
    }
  };
  lenis.on('scroll', atualizar);
  ScrollTrigger.addEventListener('refresh', atualizar);
  atualizar();
}

/** Sem animações: a trilha só acompanha a seção no meio da tela. */
function trilhaSimples() {
  const nav = document.querySelector('.trilha');
  const area = document.getElementById('projetos');
  const secoes = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => e.isIntersecting && marcarNaTrilha(e.target.id)),
    { rootMargin: '-50% 0px -50% 0px' },
  );
  document.querySelectorAll('[data-vitrine]').forEach((s) => secoes.observe(s));
  if (nav && area) {
    new IntersectionObserver(([e]) => nav.classList.toggle('visivel', e.isIntersecting), {
      rootMargin: '-45% 0px -45% 0px',
    }).observe(area);
  }
}
