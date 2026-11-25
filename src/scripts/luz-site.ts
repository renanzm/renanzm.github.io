/* Luz sutil que segue o mouse no site inteiro: um brilho fraco e uma malha de pontos
 * que só aparece em volta do cursor. A malha fica presa à página (rola junto).
 * Só com mouse; em telas de toque ou com "reduzir movimento", nada aparece. */

const RAIO_BRILHO = 650;
const RAIO_PONTOS = 230;
const SUAVE = 0.16;

export function iniciarLuzDoSite() {
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!mouse || calmo || document.querySelector('.luz-site')) return;

  const camada = document.createElement('div');
  camada.className = 'luz-site';
  camada.setAttribute('aria-hidden', 'true');
  camada.innerHTML = '<div class="luz-site-brilho"></div><div class="luz-site-pontos"></div>';
  document.body.appendChild(camada);
  const brilho = camada.children[0] as HTMLElement;
  const pontos = camada.children[1] as HTMLElement;

  // Nas páginas de projeto, a luz usa a cor do projeto
  const artigo = document.querySelector<HTMLElement>('main article[style*="--c"]');
  const corDaPagina = artigo ? getComputedStyle(artigo).getPropertyValue('--c').trim() : '';
  if (corDaPagina) document.documentElement.style.setProperty('--luz-site-cor', corDaPagina);

  let alvoX = innerWidth / 2;
  let alvoY = innerHeight / 2;
  let x = alvoX;
  let y = alvoY;
  let quadro = 0;

  const desenhar = () => {
    brilho.style.transform = `translate3d(${(x - RAIO_BRILHO).toFixed(1)}px, ${(y - RAIO_BRILHO).toFixed(1)}px, 0)`;
    const ex = x - RAIO_PONTOS;
    const ey = y - RAIO_PONTOS;
    pontos.style.transform = `translate3d(${ex.toFixed(1)}px, ${ey.toFixed(1)}px, 0)`;
    // Compensa a posição da janela e a rolagem: os pontos ficam alinhados à página
    pontos.style.backgroundPosition = `${(-ex).toFixed(1)}px ${(-ey - scrollY).toFixed(1)}px`;
  };
  const passo = () => {
    x += (alvoX - x) * SUAVE;
    y += (alvoY - y) * SUAVE;
    desenhar();
    if (Math.abs(alvoX - x) < 0.3 && Math.abs(alvoY - y) < 0.3) {
      quadro = 0;
      return;
    }
    quadro = requestAnimationFrame(passo);
  };
  const animar = () => {
    if (!quadro) quadro = requestAnimationFrame(passo);
  };

  addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerType !== 'mouse') return;
      alvoX = ev.clientX;
      alvoY = ev.clientY;
      camada.classList.add('ativa');
      animar();
    },
    { passive: true },
  );
  addEventListener('scroll', desenhar, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => camada.classList.remove('ativa'));
  addEventListener('blur', () => camada.classList.remove('ativa'));
}

/** A página inicial troca a cor da luz conforme o projeto em destaque. */
export function corDaLuz(cor: string | null) {
  if (cor) document.documentElement.style.setProperty('--luz-site-cor', cor);
  else document.documentElement.style.removeProperty('--luz-site-cor');
}
