import { getCollection, type CollectionEntry } from 'astro:content';

export type Projeto = CollectionEntry<'projetos'>;

/** Projetos publicados (sem rascunhos), na ordem da vitrine. */
export async function projetosPublicados(): Promise<Projeto[]> {
  const todos = await getCollection('projetos', ({ data }) => !data.rascunho);
  return todos.sort(
    (a, b) => a.data.ordem - b.data.ordem || b.data.data.getTime() - a.data.data.getTime(),
  );
}

/** Projetos que ganham seção própria na página inicial. */
export async function projetosVitrine(): Promise<Projeto[]> {
  return (await projetosPublicados()).filter((p) => p.data.status !== 'arquivado');
}

export const rotuloStatus: Record<Projeto['data']['status'], string> = {
  ativo: 'Disponível',
  beta: 'Beta',
  'em-desenvolvimento': 'Em desenvolvimento',
  arquivado: 'Arquivado',
};

export const nomesPlataforma: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  outro: 'Arquivo',
};

/** Link principal da vitrine: download direto, senão o primeiro link, senão a página. */
export function acaoPrincipal(p: Projeto): { rotulo: string; url: string; externo: boolean } {
  const { downloads, links, teaser } = p.data;
  if (!teaser && downloads[0]) {
    const d = downloads[0];
    return {
      rotulo: `Baixar para ${nomesPlataforma[d.plataforma]}${d.versao ? ` · v${d.versao}` : ''}`,
      url: d.url,
      externo: /^https?:/.test(d.url),
    };
  }
  if (!teaser && links[0]) return { rotulo: `${links[0].rotulo} ↗`, url: links[0].url, externo: true };
  return { rotulo: teaser ? 'Ver a prévia' : 'Ver projeto', url: `/projetos/${p.id}`, externo: false };
}
