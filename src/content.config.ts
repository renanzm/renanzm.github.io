import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projetos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projetos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      // Uma frase: aparece em listas, no topo da página e no Google
      resumo: z.string(),
      // Parágrafo curto da seção de vitrine na página inicial
      descricao: z.string().optional(),
      // Até 4 pontos fortes, mostrados na vitrine
      destaques: z.array(z.string()).max(4).default([]),
      stack: z.array(z.string()).default([]),
      plataforma: z.string().optional(),
      data: z.coerce.date(),
      // Posição na vitrine (menor vem primeiro)
      ordem: z.number().default(99),
      // Cor de destaque da seção (hex)
      cor: z.string().default('#7dd3a8'),
      status: z.enum(['ativo', 'beta', 'em-desenvolvimento', 'arquivado']).default('ativo'),
      // Sneak peek: mostra o projeto sem links de código
      teaser: z.boolean().default(false),
      rascunho: z.boolean().default(false),
      capa: image().optional(),
      galeria: z.array(z.object({ src: image(), legenda: z.string() })).default([]),
      links: z.array(z.object({ rotulo: z.string(), url: z.string().url() })).default([]),
      downloads: z
        .array(
          z.object({
            rotulo: z.string(),
            plataforma: z.enum(['windows', 'macos', 'linux', 'android', 'ios', 'web', 'outro']),
            // Link do GitHub Releases ou /downloads/arquivo (em public/)
            url: z.string(),
            tamanho: z.string().optional(),
            versao: z.string().optional(),
          }),
        )
        .default([]),
    }),
});

export const collections = { projetos };
