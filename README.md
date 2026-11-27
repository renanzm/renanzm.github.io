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

## Página inicial

A página inicial é uma ilha React (`src/landing/`) dentro do Astro, estilizada com Tailwind CSS e animada com GSAP (ScrollTrigger, SplitText e DrawSVG) sobre a rolagem suave da Lenis. As outras páginas continuam em Astro.

- `src/landing/movimento/orquestrar.ts` decide o que anima, em que ordem e em quais telas. As curvas e durações usadas em todas as animações ficam em `ritmo.ts`.
- Quem ativa "reduzir movimento" no sistema recebe a página estática, com tudo visível e os vídeos parados.
- O retrato da abertura fica em `src/assets/hero/retrato.webp`. O busto é recortado dele por uma máscara, para os riscos de luz aparecerem atrás. O recorte vem de `tools/retrato/busto.webp`: o mesmo retrato, do mesmo tamanho, com o fundo tirado num editor de imagem (fundo transparente ou branco). Para ajustar o recorte, edite esse arquivo e gere a máscara de novo:

  ```powershell
  node tools/retrato/mascara.mjs --depurar
  ```

  O script grava em `public/hero/` a máscara do busto (`busto-mascara.webp`), o halo escuro em volta dele (`busto-sombra.webp`) e o contorno que o flare acende (`busto-contorno.webp`). Com `--depurar`, grava também `tools/retrato/depuracao.png`, com o busto recortado sobre um fundo colorido. Ao trocar o retrato, troque também o `busto.webp`.
- Ao abrir a página, um brilho atravessa o busto: a faixa `.hero-busto-faixa` de `landing.css`, levada pela linha do tempo de `movimento/abertura.ts`.

### Efeitos em WebGPU

Os efeitos abaixo são adaptados de exemplos do [vgpu](https://vgpu.sh) e só são baixados em navegadores com WebGPU. Sem WebGPU, eles simplesmente não aparecem: a abertura fica com o fundo preto, a moldura dos projetos fica com a luz em CSS e as páginas de projeto ficam com o fundo liso.

- **Flare na silhueta** (`src/efeitos/flare/`, exemplo "Next.js Flare"): uma luz azulada passeia em volta do rosto, acende o contorno do busto mais perto dela e espalha raios volumétricos; com o cursor na abertura, a luz segue o cursor. O contorno é `public/hero/busto-contorno.webp`, gerado pelo `tools/retrato/mascara.mjs` junto com as máscaras. O lugar do rosto, em volta do qual a luz passeia, é `FOCO_NA_FOTO` em `pipeline.ts`. Não roda com "reduzir movimento".
- **Riscos de luz na abertura** (`src/efeitos/radiancia/riscos-de-luz.ts`, exemplo "Radiance Cascades"): arrastar o mouse no fundo, atrás do busto, risca uma linha que vira luz e ilumina a abertura em volta, com as sombras suaves que os riscos fazem uns nos outros. Cada risco fica aceso um pouco e apaga sozinho. Força, cor e alcance da luz: `EXPOSICAO`, `RADIANCIA` e `ALCANCE`; quanto o risco dura: `ACESO` e `APAGANDO`. Só com mouse ou caneta (no toque, arrastar continua rolando a página) e sem "reduzir movimento".
- **Fundo das páginas de projeto** (`src/efeitos/radiancia/fundo-projeto.ts`, mesmo exemplo): o fundo começa vazio e escuro; arrastar o mouse fora do texto pinta traços de luz na cor do projeto (campo `cor`), que iluminam a grade em volta. A luz é calculada na resolução da tela (em px de CSS, até 1920×1080; ver `escalaDaCena` em `simulation.ts`), e os traços são redesenhados nítidos por cima. Os textos ficam sobre seções escurecidas (a classe `escurecido` em `src/pages/projetos/[id].astro`), para a pintura não atrapalhar a leitura. Força da luz: `INTENSIDADE`; brilho da grade iluminada: `FUNDO`; espessura do traço: `RAIO_TRACO`.
- **Cartão holográfico** (`src/landing/holografico/`, exemplo "Holographic Card"): quando o cursor se aproxima da prévia de um app, aparece um foil holográfico: uma marca d'água de gravações onduladas no cartão inteiro, com luz perolada e difração onde o cursor passa. Também aparece na capa de cada página de projeto. Na página inicial, só é baixado quando um projeto chega perto da tela. Força: `INTENSITY` em `holografico.wgsl`.

Depois de mexer num shader, valide num dispositivo WebGPU de verdade (o build só confere a sintaxe):

```powershell
npx vgpu check src/efeitos/radiancia/luz.wgsl --require-validation
```

Os exemplos originais ficam em `radiance-cascades/`, `holographic-card/` e `nextjs-flare/`, fora do Git, só como referência. No Windows, `npx vgpu examples pull` não funciona; use `npx vgpu examples show <exemplo>` para listar os arquivos e `npx vgpu examples cat <exemplo> <arquivo>` para baixar cada um.

### Assinatura

A assinatura da abertura é escrita traço a traço a partir de vetores gerados do PNG em `tools/assinatura/assinatura.png` (traço branco, fundo transparente). Para trocar a assinatura, substitua o PNG e rode:

```powershell
node tools/assinatura/vetorizar.mjs --depurar
```

O script grava `src/landing/tracos-assinatura.ts` e, com `--depurar`, a imagem `tools/assinatura/depuracao.png`, com cada traço numerado na ordem em que é desenhado.

## Música de fundo

O site toca em loop, baixinho, a faixa em `public/audio/musica-de-fundo.aac` (hoje, a "TI9 Team Introduction Music", de The International 2019). A música tenta tocar assim que o site abre. Os navegadores só deixam um site tocar som sozinho quando a pessoa já interagiu com ele; quando bloqueiam, a música entra no primeiro clique, toque ou tecla na página. O botão "Som" do cabeçalho liga e desliga, e a escolha fica salva; ao trocar de página, a música continua do ponto em que estava. O código fica em `src/scripts/musica.ts` (volume em `VOLUME`).

Para trocar a música, substitua `public/audio/musica-de-fundo.aac` (AAC ou outro formato que os navegadores toquem; se mudar a extensão, ajuste `ARQUIVO` em `musica.ts`). Confira antes se você tem o direito de usar a gravação: a obra e a gravação têm direitos separados.

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
video:                  # opcional: mini vídeo do app funcionando
  src: /videos/meu-app.mp4      # arquivo em public/videos/ (MP4 H.264, sem áudio)
  poster: /videos/meu-app.webp  # quadro mostrado enquanto carrega
  largura: 1280
  altura: 800
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
