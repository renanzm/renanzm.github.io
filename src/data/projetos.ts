import { getCollection } from 'astro:content';

/** Projetos publicados (sem rascunhos), do mais recente para o mais antigo. */
export async function projetosPublicados() {
  const todos = await getCollection('projetos', ({ data }) => !data.rascunho);
  return todos.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}
