/* Ritmo da página: as mesmas curvas e durações em todas as animações, para o movimento
 * parecer de uma peça só. Equivalentes no CSS: --ease-expo e --ease-suave (global.css). */

export const CURVA = {
  /** Entradas: chega rápido e assenta devagar */
  entrada: 'expo.out',
  /** Luz e câmera: começa e termina suave */
  suave: 'power2.inOut',
  /** Traço da caneta */
  caneta: 'power1.inOut',
  /** Ligado à rolagem: a rolagem já dá a aceleração */
  rolagem: 'none',
  /** Volta de um elemento magnético ao lugar */
  mola: 'elastic.out(1, 0.45)',
} as const;

export const DURACAO = {
  curta: 0.6,
  media: 1.1,
  longa: 1.6,
  /** A luz do retrato acendendo */
  luz: 2.4,
} as const;

export const INTERVALO = {
  linhas: 0.08,
  itens: 0.05,
} as const;

/** Altura do cabeçalho fixo (igual a --header no CSS). */
export const CABECALHO = 64;

/** Pausa entre um projeto e o próximo, em fração da altura da tela (igual ao CSS de .pausa). */
export const PAUSA = 0.35;
