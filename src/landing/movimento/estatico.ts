/* Para quem pede menos movimento no sistema: nada anima e tudo já aparece no lugar.
 * O estado da página (cabeçalho e trilha) segue a rolagem nativa, sem efeitos. */

export function modoEstatico(raiz: HTMLElement) {
  document.documentElement.classList.remove('vai-animar');
  // Nada toca sozinho: os vídeos ficam no pôster, com controles para quem quiser assistir
  raiz.querySelectorAll<HTMLVideoElement>('video[data-video]').forEach((v) => (v.controls = true));

  const topo = document.querySelector('.topo');
  const hero = raiz.querySelector('.hero');
  const trilha = raiz.querySelector('.trilha');
  const area = raiz.querySelector('#projetos');
  const observadores: IntersectionObserver[] = [];

  if (hero && topo) {
    const o = new IntersectionObserver(([e]) => topo.classList.toggle('rolou', !e.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    });
    o.observe(hero);
    observadores.push(o);
  }

  const secoes = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        raiz.querySelectorAll<HTMLElement>('.trilha a').forEach((a) => {
          if (a.dataset.alvo === e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }),
    { rootMargin: '-50% 0px -50% 0px' },
  );
  raiz.querySelectorAll('[data-vitrine]').forEach((s) => secoes.observe(s));
  observadores.push(secoes);

  if (trilha && area) {
    const o = new IntersectionObserver(([e]) => trilha.classList.toggle('visivel', e.isIntersecting), {
      rootMargin: '-45% 0px -45% 0px',
    });
    o.observe(area);
    observadores.push(o);
  }

  return () => observadores.forEach((o) => o.disconnect());
}
