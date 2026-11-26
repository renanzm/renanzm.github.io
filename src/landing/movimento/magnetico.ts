/* Botões principais puxados de leve pelo cursor: dizem "isto é clicável" antes do clique. */
import { gsap } from './gsap';

const FORCA_X = 0.28;
const FORCA_Y = 0.4;

export function magneticos(raiz: HTMLElement) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const limpezas = gsap.utils.toArray<HTMLElement>('[data-magnetico]', raiz).map((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
    let centro = { x: 0, y: 0 };
    // Mede uma vez ao entrar (parado), e não a cada movimento
    const entrar = () => {
      const r = el.getBoundingClientRect();
      centro = { x: r.left + r.width / 2 - Number(gsap.getProperty(el, 'x')), y: r.top + r.height / 2 - Number(gsap.getProperty(el, 'y')) };
    };
    const mover = (ev: PointerEvent) => {
      x((ev.clientX - centro.x) * FORCA_X);
      y((ev.clientY - centro.y) * FORCA_Y);
    };
    const sair = () => {
      x(0);
      y(0);
    };
    el.addEventListener('pointerenter', entrar);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerleave', sair);
    return () => {
      el.removeEventListener('pointerenter', entrar);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerleave', sair);
    };
  });
  return () => limpezas.forEach((f) => f());
}
