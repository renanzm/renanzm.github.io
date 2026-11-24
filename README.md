# my-site

Portfólio e hub de apps feito com [Astro](https://astro.build), publicado no GitHub Pages em https://renanzm.github.io.

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

## Publicar no GitHub Pages

O workflow em `.github/workflows/deploy.yml` gera e publica o site a cada `git push` na `main`.

Configuração (uma vez só):

1. Crie no GitHub um repositório público chamado **`renanzm.github.io`**. Esse nome faz o site abrir na raiz do endereço.
2. Envie este projeto para ele:

   ```powershell
   git remote add origin https://github.com/renanzm/renanzm.github.io.git
   git push -u origin main
   ```

3. No repositório, vá em **Settings › Pages** e, em **Source**, escolha **GitHub Actions**.
4. Acompanhe o deploy na aba **Actions**. Em um ou dois minutos o site está no ar.

### Domínio próprio (opcional)

Para usar um endereço como `renanzm.dev`:

1. Compre o domínio num registrador (Cloudflare, Porkbun, Namecheap...).
2. Em **Settings › Pages › Custom domain**, digite o domínio e siga as instruções de DNS do GitHub.
3. Troque `site` no `astro.config.mjs` para o novo endereço e crie `public/CNAME` contendo só o domínio.
