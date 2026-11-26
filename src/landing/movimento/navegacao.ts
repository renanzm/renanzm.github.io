/* Rolagem suave (Lenis) ligada ao ScrollTrigger, links internos e o estado da página conforme a
 * rolagem: cabeçalho, luz do site, trilha lateral e qual vídeo toca. */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger } from './gsap';
import { posicaoReal } from './projetos';
import { CABECALHO } from './ritmo';
import { corDaLuz } from '../../scripts/luz-site';

/** Lenis movida pelo relógio da GSAP, para rolagem e animações andarem no mesmo quadro. */
export function rolagemSuave() {
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  const quadro = (tempo: number) => lenis.raf(tempo * 1000);
  gsap.ticker.add(quadro);
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) Object.assign(window, { lenis, ScrollTrigger, gsap });

  // Links para âncoras da própria página rolam com a Lenis, respeitando as seções fixadas
  const aoClicar = (ev: MouseEvent) => {
    const link = (ev.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const alvo = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!alvo) return;
    ev.preventDefault();
    // A Lenis já desconta o cabeçalho pelo scroll-padding-top do CSS
    lenis.scrollTo(posicaoReal(alvo), { duration: 1.6 });
    history.replaceState(null, '', url.hash);
  };
  document.addEventListener('click', aoClicar);

  return {
    lenis,
    parar() {
      document.removeEventListener('click', aoClicar);
      gsap.ticker.remove(quadro);
      lenis.destroy();
    },
  };
}

/** Chegou por um link com #âncora: vai até a seção depois de montar as fixadas, e de novo
 * quando fontes e imagens terminam de carregar (mudam as alturas), se a pessoa ainda não rolou. */
export function irParaAncoraInicial(lenis: Lenis) {
  const alvo = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  let pessoaRolou = false;
  const marcar = () => (pessoaRolou = true);
  const tipos = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  for (const tipo of tipos) addEventListener(tipo, marcar, { once: true, passive: true });
  const recalcular = () => {
    ScrollTrigger.refresh();
    if (alvo && !pessoaRolou) lenis.scrollTo(posicaoReal(alvo), { immediate: true, force: true });
  };
  if (alvo) recalcular();
  addEventListener('load', recalcular);
  document.fonts?.ready.then(recalcular);
  return () => {
    removeEventListener('load', recalcular);
    for (const tipo of tipos) removeEventListener(tipo, marcar);
  };
}

/* ------------------------------------------------------- trilha e vídeos */
function marcarNaTrilha(id: string | null) {
  document.querySelectorAll<HTMLElement>('.trilha a').forEach((a) => {
    if (a.dataset.alvo === id) a.setAttribute('aria-current', 'true');
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

/** Estado da página pela rolagem. Tudo por gatilhos do ScrollTrigger, que já sabem onde cada
 * seção começa e termina: nada é medido a cada quadro. Cria depois das fixações. */
export function estadoDaRolagem(raiz: HTMLElement) {
  const topo = document.querySelector('.topo');
  const trilha = raiz.querySelector('.trilha');
  const secoes = gsap.utils.toArray<HTMLElement>('[data-vitrine]', raiz);
  const lugares = secoes.map(posicaoReal);
  if (!lugares.length) return;

  const raizDoc = document.documentElement;
  // Enquanto o retrato está à vista, o cabeçalho fica sem fundo e a luz do cursor, apagada
  raizDoc.setAttribute('data-sem-luz', '');
  ScrollTrigger.create({
    trigger: lugares[0],
    start: `top ${CABECALHO + 1}px`,
    end: 'max',
    onToggle: (st) => {
      topo?.classList.toggle('rolou', st.isActive);
      raizDoc.toggleAttribute('data-sem-luz', !st.isActive);
    },
  });

  // Projeto ativo: o que já passou do meio da tela
  let ativo: string | null = null;
  const ativar = (id: string | null) => {
    if (id === ativo) return;
    ativo = id;
    marcarNaTrilha(id);
    trilha?.classList.toggle('visivel', id !== null);
    tocarSo(id);
    // A luz do site assume a cor do projeto em destaque
    const secao = id ? document.getElementById(id) : null;
    corDaLuz(secao ? getComputedStyle(secao).getPropertyValue('--c').trim() : null);
  };
  secoes.forEach((secao, i) => {
    const proximo = lugares[i + 1];
    ScrollTrigger.create({
      trigger: lugares[i],
      start: 'top center',
      endTrigger: proximo ?? lugares[i],
      end: proximo ? 'top center' : 'bottom center',
      onToggle: (st) => {
        if (st.isActive) ativar(secao.id);
        else if (ativo === secao.id) ativar(null);
      },
    });
  });

  return () => {
    ativar(null);
    topo?.classList.remove('rolou');
    raizDoc.removeAttribute('data-sem-luz');
  };
}
