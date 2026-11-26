/* Raio-x do busto: uma lente redonda segue o cursor na abertura e, dentro dela, o rosto dá lugar
 * à malha de triângulos (public/hero/busto-malha.webp, gerada por tools/retrato/malha.mjs). A
 * camada usa a mesma máscara do busto, então a lente só aparece em cima dele.
 *
 * A lente é a máscara da camada: um círculo em --rx/--ry com raio --rr (px da camada), que o loop
 * abaixo leva suavemente até o cursor e fecha quando o cursor sai. Só em telas com mouse; a malha
 * só é baixada no primeiro movimento do mouse por cima da abertura. */

/** Raio da lente, em fração da altura do busto. */
const RAIO = 0.17;
/** Suavização por quadro (0 a 1): posição e abertura da lente. */
const SEGUE = 0.2;
const ABRE = 0.14;

export function instalarRaioX(area: HTMLElement, camada: HTMLElement) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const malha = camada.querySelector<HTMLImageElement>('img[data-src]');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alvo = { x: 0, y: 0, r: 0 };
  const atual = { x: 0, y: 0, r: 0 };
  let quadro = 0;

  const aplicar = () => {
    camada.style.setProperty('--rx', `${atual.x.toFixed(1)}px`);
    camada.style.setProperty('--ry', `${atual.y.toFixed(1)}px`);
    camada.style.setProperty('--rr', `${atual.r.toFixed(1)}px`);
    camada.classList.toggle('ativo', atual.r > 0.5);
  };

  const passo = () => {
    quadro = 0;
    const [k, kr] = calmo ? [1, 1] : [SEGUE, ABRE];
    atual.x += (alvo.x - atual.x) * k;
    atual.y += (alvo.y - atual.y) * k;
    atual.r += (alvo.r - atual.r) * kr;
    const parado = Math.abs(alvo.x - atual.x) < 0.3 && Math.abs(alvo.y - atual.y) < 0.3 && Math.abs(alvo.r - atual.r) < 0.3;
    if (parado) Object.assign(atual, alvo);
    aplicar();
    if (!parado) quadro = requestAnimationFrame(passo);
  };
  const acordar = () => {
    if (!quadro) quadro = requestAnimationFrame(passo);
  };

  const mover = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    if (malha && !malha.src) malha.src = malha.dataset.src!;
    // A camada pode estar escalada (abertura e rolagem): o cursor volta para os px dela
    const caixa = camada.getBoundingClientRect();
    const escala = caixa.width / Math.max(1, camada.offsetWidth);
    const x = (event.clientX - caixa.left) / escala;
    const y = (event.clientY - caixa.top) / escala;
    // Entrando, a lente abre já no lugar do cursor, em vez de deslizar de onde fechou
    if (atual.r < 0.5) Object.assign(atual, { x, y });
    Object.assign(alvo, { x, y, r: camada.offsetHeight * RAIO });
    acordar();
  };
  const sair = () => {
    alvo.r = 0;
    acordar();
  };

  area.addEventListener('pointermove', mover, { passive: true });
  area.addEventListener('pointerleave', sair);
  return () => {
    area.removeEventListener('pointermove', mover);
    area.removeEventListener('pointerleave', sair);
    if (quadro) cancelAnimationFrame(quadro);
  };
}
