// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages: o repositório precisa se chamar renanzm.github.io.
  // Se um dia usar domínio próprio (ex.: renanzm.dev), troque aqui.
  site: 'https://renanzm.github.io',
  // A página inicial é uma ilha React (src/landing); o resto do site continua em Astro
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
