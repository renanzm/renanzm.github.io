/* Inclinação 3D e luz que seguem o mouse nas imagens e vídeos dos apps.
 * Só com mouse de verdade; no toque ou com "reduzir movimento", nada muda. */

const GRAUS = 6; // inclinação máxima
const DESLIZE = 7; // deslocamento máximo, em px
const SUAVE = 0.11; // quanto anda por quadro em direção ao alvo

const limitar = (v: number) => Math.min(1, Math.max(0, v));

export function iniciarInclinacao(raiz: ParentNode = document) {
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!mouse || calmo) return;
  raiz.querySelectorAll<HTMLElement>('[data-inclina]').forEach(preparar);
}

function preparar(el: HTMLElement) {
  if (el.dataset.inclinaPronto) return;
  el.dataset.inclinaPronto = '1';
  el.classList.add('inclina');
  // Camadas de luz por cima da mídia (cor, reflexo, pontos e borda)
  for (const nome of ['luz-cor', 'luz-reflexo', 'luz-pontos', 'luz-borda']) {
    const camada = document.createElement('span');
    camada.className = `luz ${nome}`;
    camada.setAttribute('aria-hidden', 'true');
    el.appendChild(camada);
  }

  const forca = Number(el.dataset.inclina) || 1;
  // Mede pelo pai (que não gira), para a posição do mouse não depender da inclinação
  const base = el.parentElement ?? el;
  let alvoX = 0.5, alvoY = 0.5, x = 0.5, y = 0.5;
  let alvoLuz = 0, luz = 0;
  let quadro = 0;

  const passo = () => {
    x += (alvoX - x) * SUAVE;
    y += (alvoY - y) * SUAVE;
    luz += (alvoLuz - luz) * 0.09;
    const rx = (0.5 - y) * 2 * GRAUS * forca * luz;
    const ry = (x - 0.5) * 2 * GRAUS * forca * luz;
    const tx = (x - 0.5) * DESLIZE * luz;
    const ty = (y - 0.5) * DESLIZE * luz;
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${(1 + 0.012 * luz).toFixed(4)})`;
    el.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    el.style.setProperty('--luz', luz.toFixed(3));
    const parado = Math.abs(alvoX - x) < 0.0008 && Math.abs(alvoY - y) < 0.0008 && Math.abs(alvoLuz - luz) < 0.002;
    if (parado) {
      quadro = 0;
      if (alvoLuz === 0) {
        el.style.transform = '';
        el.style.setProperty('--luz', '0');
      }
      return;
    }
    quadro = requestAnimationFrame(passo);
  };
  const animar = () => {
    if (!quadro) quadro = requestAnimationFrame(passo);
  };

  el.addEventListener('pointermove', (ev) => {
    const r = base.getBoundingClientRect();
    alvoX = limitar((ev.clientX - r.left) / r.width);
    alvoY = limitar((ev.clientY - r.top) / r.height);
    alvoLuz = 1;
    animar();
  });
  el.addEventListener('pointerleave', () => {
    alvoX = 0.5;
    alvoY = 0.5;
    alvoLuz = 0;
    animar();
  });
}
