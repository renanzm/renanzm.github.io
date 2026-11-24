# my-site

Portfólio e hub de apps feito com [Astro](https://astro.build), publicado no GitHub Pages em https://renanzm.github.io.

## Rodar localmente

```powershell
npm install
npm run dev
```

Abra http://localhost:4321.

## Editar suas informações

Nome, bio, stack e redes sociais ficam em `src/data/site.ts`. Os ícones do stack são da [skill-icons](https://github.com/tandpfun/skill-icons) (licença MIT) e ficam em `public/stack/`.

## Adicionar um projeto

Crie um arquivo `.md` em `src/content/projetos/`. O nome do arquivo vira o endereço da página (`meu-app.md` → `/projetos/meu-app`). Cada projeto não arquivado ganha uma seção de tela cheia na página inicial, na ordem do campo `ordem`.

```md
---
titulo: Meu App
resumo: Uma frase sobre o que ele faz.
descricao: Parágrafo curto mostrado na seção da página inicial.
destaques:              # até 4 pontos fortes
  - Primeiro ponto forte
  - Segundo ponto forte
stack: [Rust, Tauri]
plataforma: Windows
data: 2026-11-24
ordem: 7                # posição na página inicial (menor vem primeiro)
cor: '#38bdf8'          # cor de destaque da seção
status: ativo           # ativo | beta | em-desenvolvimento | arquivado
teaser: false           # true = sneak peek, sem links nem downloads
rascunho: false         # true esconde o projeto do site
capa: ../../assets/projetos/meu-app.png   # imagem em src/assets/
galeria:
  - src: ../../assets/projetos/meu-app-2.png
    legenda: Outra tela
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
2. No DNS do domínio, crie estes registros (no Cloudflare, deixe a nuvem **cinza**, "DNS only"):

   | Tipo | Nome | Valor |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `renanzm.github.io` |

3. Em **Settings › Pages › Custom domain**, digite o domínio, salve e marque **Enforce HTTPS** quando o certificado ficar pronto.
4. Troque `site` no `astro.config.mjs` para o novo endereço.

Com deploy pelo GitHub Actions, o arquivo `CNAME` não é usado: o domínio fica só nas configurações do repositório. Configure o domínio no GitHub **depois** que o DNS estiver apontando, porque a partir daí o endereço `renanzm.github.io` passa a redirecionar para ele.
