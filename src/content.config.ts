import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projetos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projetos' }),
  schema: z.object({
    titulo: z.string(),
    resumo: z.string(),
    data: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    destaque: z.boolean().default(false),
    rascunho: z.boolean().default(false),
    status: z.enum(['ativo', 'beta', 'arquivado']).default('ativo'),
    // Caminho em /public (ex.: /capas/app.png) ou URL externa
    capa: z.string().optional(),
    links: z
      .array(z.object({ rotulo: z.string(), url: z.string().url() }))
      .default([]),
    downloads: z
      .array(
        z.object({
          rotulo: z.string(),
          plataforma: z.enum(['windows', 'macos', 'linux', 'android', 'ios', 'web', 'outro']),
          // /downloads/arquivo.zip (em public/) ou link do GitHub Releases
          url: z.string(),
          tamanho: z.string().optional(),
          versao: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { projetos };
