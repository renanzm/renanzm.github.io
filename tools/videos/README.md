# Gravação dos mini vídeos

Scripts que gravam os vídeos curtos de cada app mostrados no site (`public/videos/`). Use quando lançar uma versão nova de um app e quiser o vídeo atualizado.

```powershell
npm run videos -- rz widget          # só alguns
npm run videos -- todos              # todos os vídeos
npm run videos -- soundmod-python    # o print do Sound Mod em Python
```

Depois, confira os arquivos em `public/videos/` e rode `npm run dev` para ver no site.

## O que cada um faz

| Nome | Saída | Como grava | Janela na tela? |
|---|---|---|---|
| `soundmod` | `sound-mod-rs.mp4` | Abre o `SoundMod.exe` da release uma vez por tema e grava a janela com o `gfxcapture` do ffmpeg | Sim, por ~40 s |
| `widget` | `usage-widget.mp4` | A interface real (`ui/`) no Edge headless, com a ponte do Tauri simulada e dados fictícios | Não |
| `launcher` | `app-launcher.mp4` | Código da última tag (ou `node tools/videos/gravar-launcher.mjs v2.0.1`), com roteiro em `launcher_roteiro.py` e download real do GitHub | Sim, por ~30 s |
| `rz` | `rz-airsoft.mp4` | Sobe o servidor numa pasta temporária, cria dados fictícios (`rz-dados.mjs`) e grava no Edge headless | Não |
| `focus` | `focus-temp-tool.mp4` | Roda os comandos de verdade e grava um terminal com as saídas | Não |
| `jogo` | `idle-gas-station.mp4` | Movie Maker do Godot com a ferramenta de cenários do jogo | Sim, por ~1 min |
| `soundmod-python` | `src/assets/projetos/sound-mod-python.webp` | Print do Sound Mod em Python, rodando o código-fonte | Sim, por ~10 s |

Cada script também gera o pôster (`.webp`), o quadro mostrado enquanto o vídeo carrega.

## Segurança dos seus dados

- **Sound Mod:** usa `SOUNDMOD_DATA_DIR` numa pasta temporária, com todos os dispositivos de áudio em "nenhum". Suas configurações em `%APPDATA%\SoundMod` não são tocadas.
- **App Launcher:** roda uma cópia com outro `app_id` e pasta `Apps` própria. O estado temporário em `%LOCALAPPDATA%` é apagado no fim, e seu clone não é alterado.
- **RZ Airsoft:** só dados fictícios, numa pasta de dados temporária. A pasta `dados/` da oficina não é lida.
- **Idle Gas Station:** a ferramenta de cenários usa save e configurações isolados. Nenhum arquivo de código vai para o site.

## Requisitos

- Windows, Node, Microsoft Edge e ffmpeg (com `libx264`, `libwebp` e `gfxcapture`).
- Os repositórios dos apps na mesma pasta que o `my-site` (ex.: `Documents\GitHub`).
- **launcher:** o `.venv` do app-launcher com PyQt6.
- **soundmod:** a build em `sound-mod-rs\dist\SoundMod\SoundMod.exe`.
- **jogo:** Godot 4.7.
- **rz** e **focus:** Python no PATH.
- **soundmod-python:** o `.venv` do sound-mod.

## Variáveis de ambiente (opcionais)

| Variável | Padrão |
|---|---|
| `REPOS_DIR` | a pasta acima do `my-site` |
| `VIDEOS_SAIDA` | `public/videos` |
| `VIDEOS_TEMP` | `%TEMP%\my-site-videos` |
| `FFMPEG` | `ffmpeg` do PATH ou o do Hermes em `%LOCALAPPDATA%` |
| `GODOT` | `C:\Godot\Godot_v4.7.2-stable_win64.exe` |
| `EDGE` | o Edge instalado em `Program Files (x86)` |
| `PYTHON` | `python` |
| `SOUNDMOD_EXE`, `LAUNCHER_PYTHON` | os caminhos dentro de cada repositório |
