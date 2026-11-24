---
titulo: App Launcher
resumo: Launcher para Windows que instala, atualiza e executa apps distribuídos por FTP/FTPS.
descricao: Um único executável que serve para qualquer conjunto de aplicativos, porque servidor, apps, opções e downloads ficam num arquivo de configuração. Baixa com segurança, confere o hash e atualiza até a si mesmo.
destaques:
  - Instala e atualiza comparando data e tamanho no servidor
  - Downloads conferidos por tamanho e SHA-256
  - Atualização automática do app e do próprio launcher
stack: [Python, PyQt6, FTP/FTPS]
plataforma: Windows
data: 2026-11-03
ordem: 3
cor: '#a78bfa'
capa: ../../assets/projetos/app-launcher.png
galeria:
  - src: ../../assets/projetos/app-launcher.png
    legenda: Tela principal
  - src: ../../assets/projetos/app-launcher-downloads.png
    legenda: Downloads avulsos
  - src: ../../assets/projetos/app-launcher-config.png
    legenda: Configurações
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/app-launcher
---

Tudo o que muda de um ambiente para outro (servidor, aplicativos, opções, login, downloads avulsos) fica num único `launcher_config.json`, então o mesmo executável serve para qualquer conjunto de aplicativos. Feito em Python com PyQt6: interface escura, cor de destaque configurável e todo o trabalho de rede fora da thread da interface.

## Recursos

- **Vários aplicativos** num seletor, cada um com sua pasta, pacote e executável.
- **Instala e atualiza** a partir do servidor, comparando data e tamanho do pacote publicado com a versão instalada.
- **Downloads seguros:** arquivo `.part`, conferência de tamanho e de hash SHA-256, e proteção contra *Zip Slip* na extração.
- **FTP ou FTPS** (TLS explícito), com credenciais criptografadas ou buscadas de uma URL remota.
- **Atualização automática** do aplicativo selecionado e do próprio launcher.
- **Opções por aplicativo** declaradas na configuração, que viram variáveis de ambiente do processo.
- **Downloads avulsos** em abas, login HTTP opcional, verificação de integridade e desinstalação.
- Interface em **português e inglês**.

## Experimentar

Requer Windows e Python 3.11+. O repositório inclui um servidor de demonstração, então dá para ver tudo funcionando sem um servidor real:

```bash
python -m tools.demo_server
python -m launcher
```
