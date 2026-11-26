/* A assinatura escrita traço a traço, na ordem e no ritmo da caneta. */
import { gsap } from './gsap';
import { CURVA } from './ritmo';

/** Velocidade da caneta, em unidades da assinatura (ela tem 1646 de largura) por segundo. */
const VELOCIDADE = 3300;

const tracosDe = (svg: Element | null) =>
  svg ? gsap.utils.toArray<SVGPathElement>(svg.querySelectorAll('.caneta path')) : [];

/** Liga a máscara da caneta sobre a tinta e apaga os traços: a assinatura some até ser escrita. */
export function apagar(svg: Element | null) {
  const tinta = svg?.querySelector('.tinta');
  const mascara = svg?.getAttribute('data-mascara');
  if (tinta && mascara) gsap.set(tinta, { attr: { mask: `url(#${mascara})` }, visibility: 'visible' });
  gsap.set(tracosDe(svg), { visibility: 'hidden' });
}

/** Junta os trechos que seguem um ao outro sem a caneta levantar (data-continua). */
function gestosDe(tracos: SVGPathElement[]) {
  const gestos: SVGPathElement[][] = [];
  for (const traco of tracos) {
    const anterior = gestos[gestos.length - 1];
    if (traco.dataset.continua !== undefined && anterior) anterior.push(traco);
    else gestos.push([traco]);
  }
  return gestos;
}

/** Linha do tempo que escreve a assinatura. Serve tanto tocada sozinha quanto presa à rolagem. */
export function escrever(svg: Element | null, velocidade = VELOCIDADE): gsap.core.Timeline {
  const gestos = gestosDe(tracosDe(svg));
  const tl = gsap.timeline();
  let t = 0;
  gestos.forEach((trechos, i) => {
    // O sublinhado do fim sai num gesto só, mais rápido
    const ritmo = i === gestos.length - 1 ? 1.5 : 1;
    // Dentro de um gesto a caneta não para: os trechos se emendam em velocidade constante...
    const gesto = gsap.timeline({ paused: true });
    let fim = 0;
    for (const trecho of trechos) {
      const largura = parseFloat(trecho.style.getPropertyValue('--w')) || 2;
      const comprimento = Number(trecho.dataset.comprimento) || trecho.getTotalLength();
      // ...mais depressa onde o traço afina, que é onde a mão passou rápido
      const duracao = Math.max(0.02, comprimento / (velocidade * ritmo * (largura < 1.5 ? 1.7 : 1)));
      gesto
        .set(trecho, { visibility: 'visible' }, fim)
        .fromTo(trecho, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: duracao, ease: 'none' }, fim);
      fim += duracao;
    }
    // ...e o gesto inteiro acelera no começo e freia no fim, como a mão
    tl.add(gesto.tweenFromTo(0, gesto.duration(), { ease: CURVA.caneta }), t);
    // A caneta levanta entre um gesto e outro
    t += gesto.duration() + 0.04;
  });
  // Escrita completa: a máscara sai, e a tinta aparece inteira mesmo onde o pincel não passou
  const tinta = svg?.querySelector('.tinta');
  if (tinta) tl.set(tinta, { attr: { mask: 'none' } });
  return tl;
}
