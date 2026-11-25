---
titulo: App Launcher
resumo: Launcher para Windows, no estilo dos launchers de jogos, que instala e atualiza apps direto das releases do GitHub.
descricao: Aponte um app para um repositório e o launcher encontra a release mais recente, baixa, confere e instala. A versão 2 trouxe um visual novo, com biblioteca de apps, a arte de cada projeto e as notas de versão dentro do próprio launcher.
destaques:
  - Instala e atualiza direto das releases do GitHub
  - Downloads conferidos pelo SHA-256 que o GitHub publica
  - Progresso de loja, com velocidade e tempo restante
  - Funciona offline com os últimos dados vistos
stack: [Python, PyQt6, GitHub Releases]
plataforma: Windows
data: 2026-11-25
ordem: 3
cor: '#a78bfa'
capa: ../../assets/projetos/app-launcher/principal.webp
galeria:
  - src: ../../assets/projetos/app-launcher/principal.webp
    legenda: Biblioteca de apps e a página de cada projeto
  - src: ../../assets/projetos/app-launcher/notas.webp
    legenda: Notas de versão renderizadas do Markdown
  - src: ../../assets/projetos/app-launcher/download.webp
    legenda: Download com velocidade e tempo restante
  - src: ../../assets/projetos/app-launcher/configuracoes.webp
    legenda: Configurações
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/app-launcher
  - rotulo: Notas da versão 2.0
    url: https://github.com/renanzm/app-launcher/releases/tag/v2.0.0
downloads:
  - rotulo: Launcher.exe
    plataforma: windows
    url: https://github.com/renanzm/app-launcher/releases/download/v2.0.0/Launcher.exe
    versao: 2.0.0
    tamanho: 38,7 MB
---

O App Launcher instala, atualiza e executa aplicativos publicados como releases no GitHub ou distribuídos por FTP/FTPS. Tudo o que muda de um ambiente para outro fica num único `launcher_config.json`, então o mesmo executável serve para qualquer conjunto de aplicativos.

Funciona sem configurar nada: sem um `launcher_config.json` ao lado, ele já vem com o [Sound Mod](/projetos/sound-mod-rs) e o [Usage Widget](/projetos/usage-widget) no catálogo e instala os apps numa pasta `Apps` ao lado dele.

## Novidades da versão 2

- **Releases do GitHub como fonte:** aponte um app para `dono/repo` e o launcher escolhe o arquivo para Windows (`.zip` ou `.exe`), baixa e instala. Releases novas aparecem sozinhas como atualização.
- **Visual de launcher de jogo:** biblioteca com os ícones reais dos apps, cabeçalho com a arte e o screenshot de cada um, cartões com novidades, versões e dados do repositório, e um botão grande de Instalar, Atualizar ou Abrir.
- **Notas de versão** renderizadas do Markdown, com imagens. Notas bilíngues mostram só o idioma da interface.
- **Progresso de loja:** tamanho, velocidade e tempo restante, com botão para cancelar.
- **Atualização automática** dos apps instalados (opcional) e do próprio launcher.
- **Funciona offline:** as respostas do GitHub ficam em cache, quase sem gastar o limite da API.
- **Janela nativa** no Windows 11, com sombra, cantos arredondados e snap.

## Continua no launcher

- **Downloads seguros:** arquivo `.part`, conferência de tamanho e de SHA-256 e proteção contra *Zip Slip* na extração.
- **FTP ou FTPS** por app, com credenciais cifradas ou buscadas de uma URL remota.
- **Opções por app** que viram variáveis de ambiente, ações extras, login HTTP opcional, verificar integridade e desinstalar.
- Interface em **português e inglês**.

## Rodar pelo código

Requer Windows e Python 3.11+:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
python -m launcher
```

> O executável ainda não tem assinatura digital. Na primeira vez, o SmartScreen pode mostrar um aviso: clique em **Mais informações → Executar assim mesmo**.
