/* Dados que a página Astro (src/pages/index.astro) monta no build e entrega à ilha React.
 * Tudo aqui precisa ser serializável: viaja como props para o navegador. */

export interface Foto {
  src: string;
  srcsetAvif: string;
  srcsetWebp: string;
  largura: number;
  altura: number;
  alt: string;
}

export type MidiaCartao =
  | { tipo: 'video'; src: string; poster: string; largura: number; altura: number }
  | { tipo: 'imagem'; src: string; srcset: string; largura: number; altura: number; encaixe: 'cobrir' | 'conter' };

export interface ProjetoCartao {
  id: string;
  titulo: string;
  resumo: string;
  descricao?: string;
  destaques: string[];
  chips: string[];
  cor: string;
  status: string;
  teaser: boolean;
  acao: { rotulo: string; url: string; externo: boolean };
  pagina: string;
  midia: MidiaCartao | null;
}

export interface Fato {
  rotulo: string;
  valor: string;
}

export interface DadosLanding {
  nome: string;
  cargo: string;
  empresa: string;
  cidade: string;
  chamada: string;
  /** Frase do "Sobre"; trechos entre *asteriscos* ganham a fonte com serifa */
  declaracao: string;
  bio: string[];
  fatos: Fato[];
  stack: { id: string; nome: string }[];
  extras: string[];
  github: string;
  linkedin: string;
  foto: Foto;
  projetos: ProjetoCartao[];
  arquivados: { id: string; titulo: string; resumo: string }[];
}
