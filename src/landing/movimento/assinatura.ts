/* A assinatura escrita traço a traço, na ordem e no ritmo da caneta. */
import { gsap } from './gsap';
import { CURVA } from './ritmo';

/** Velocidade da caneta, em unidades da assinatura (ela tem 1646 de largura) por segundo. */
const VELOCIDADE = 2300;

const tracosDe = (svg: Element | null) => (svg ? gsap.utils.toArray<SVGPathElement>(svg.querySelectorAll('path')) : []);

/** Some com os traços (antes de escrever). */
export function apagar(svg: Element | null) {
  gsap.set(tracosDe(svg), { visibility: 'hidden' });
}

/** Linha do tempo que escreve a assinatura. Serve tanto tocada sozinha quanto presa à rolagem. */
export function escrever(svg: Element | null, velocidade = VELOCIDADE): gsap.core.Timeline {
  const tracos = tracosDe(svg);
  const tl = gsap.timeline();
  let t = 0;
  tracos.forEach((traco, i) => {
    const largura = parseFloat(traco.style.getPropertyValue('--w')) || 2;
    const comprimento = Number(traco.dataset.comprimento) || traco.getTotalLength();
    const fino = largura < 1.8;
    const ultimo = i === tracos.length - 1;
    // Traço fino é a caneta passando rápido; o sublinhado do fim sai num gesto só
    const v = velocidade * (fino ? 2 : ultimo ? 1.5 : 1);
    const duracao = gsap.utils.clamp(0.05, 0.9, comprimento / v);
    tl.set(traco, { visibility: 'visible' }, t).fromTo(
      traco,
      { drawSVG: '0% 0%' },
      { drawSVG: '0% 100%', duration: duracao, ease: fino ? 'power1.out' : CURVA.caneta },
      t,
    );
    // A caneta levanta entre um traço e outro
    t += duracao + (fino ? 0.01 : 0.04);
  });
  return tl;
}
