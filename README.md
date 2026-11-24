# my-site

Portfólio e hub de apps feito com [Astro](https://astro.build), publicado na Vercel.

## Rodar localmente

```powershell
npm install
npm run dev
```

Abra http://localhost:4321.

## Editar suas informações

Nome, bio e redes sociais ficam em `src/data/site.ts`.

## Adicionar um projeto

Crie um arquivo `.md` em `src/content/projetos/`. O nome do arquivo vira o endereço da página (`meu-app.md` → `/projetos/meu-app`).

```md
---
titulo: Meu App
resumo: Uma frase sobre o que ele faz.
data: 2026-11-24
tags: [web, ferramenta]
destaque: true          # aparece na página inicial (máx. 3)
status: ativo           # ativo | beta | arquivado
rascunho: false         # true esconde o projeto do site
capa: /capas/meu-app.png   # opcional, arquivo em public/capas/
links:
  - rotulo: Abrir app
    url: https://meu-app.vercel.app
downloads:
  - rotulo: Instalador
    plataforma: windows  # windows | macos | linux | android | ios | web | outro
    url: https://github.com/usuario/repo/releases/download/v1.0.0/setup.exe
    versao: 1.0.0
    tamanho: 40 MB
---

Texto livre em Markdown com a descrição completa do projeto.
```

### Onde guardar os arquivos de download

- **Arquivos grandes (builds, instaladores, APKs):** use o GitHub Releases do repositório do app e cole o link aqui. É grátis, tem controle de versão e não pesa no deploy do site.
- **Arquivos pequenos (poucos MB):** coloque em `public/downloads/` e use `url: /downloads/arquivo.zip`.

## Publicar na Vercel

1. Suba este repositório no GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório. A Vercel detecta o Astro sozinha.
3. Depois do primeiro deploy, coloque a URL final em `site` no `astro.config.mjs`.

Cada `git push` na branch `main` publica uma nova versão.
