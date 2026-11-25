---
titulo: Usage Widget
resumo: Widget para o Windows com o gasto e os limites do Claude Code, do Codex e do Cursor.
descricao: Fica na borda da tela como uma abinha e, ao passar o mouse, abre um painel com o ritmo de gasto, os limites do plano e a projeção do mês. Tudo roda na sua máquina.
destaques:
  - Limites de 5 horas e da semana, com o tempo até zerar
  - Velocímetro do gasto em dólares por hora
  - Alertas do Windows quando o ritmo sobe
stack: [Rust, Tauri, JavaScript]
plataforma: Windows
data: 2026-11-24
ordem: 2
cor: '#34d399'
capa: ../../assets/projetos/usage-widget.png
video:
  src: /videos/usage-widget.mp4
  poster: /videos/usage-widget.webp
  largura: 1280
  altura: 800
galeria:
  - src: ../../assets/projetos/usage-widget.png
    legenda: Tema escuro
  - src: ../../assets/projetos/usage-widget-claro.png
    legenda: Tema claro
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/cursor-usage-widget
downloads:
  - rotulo: Executável (.exe)
    plataforma: windows
    url: https://github.com/renanzm/cursor-usage-widget/releases/download/v1.0.0/cursor-usage-widget.exe
    versao: 1.0.0
    tamanho: 4,3 MB
---

Mostra, sem abrir nenhum painel web, **quanto você está gastando** com agentes de código e **quanto já usou dos limites do plano**. Fica na borda da tela como uma abinha, e passar o mouse por cima abre o painel completo.

## O que ele mostra

- **Aba recolhida:** a fonte atual e o limite mais apertado do plano (janela de 5 horas ou semana), com barra colorida.
- **Ritmo:** um velocímetro do gasto em USD/h nas últimas horas.
- **Limites do plano:** porcentagem usada e tempo até zerar (Claude Pro/Max e planos do ChatGPT no Codex).
- **Ciclo mensal:** gasto do mês contra sua cota, com projeção até o fim do ciclo.
- **Semana:** um equalizador de segunda a sexta com o gasto de cada dia.
- **Alertas:** notificações do Windows quando o ritmo sobe ou o ciclo passa de certos limites.

## Fontes de dados

| Fonte | Custo | Limites |
|---|---|---|
| **Claude Code** | Logs locais (estimativa por tokens) | API de uso da Anthropic, com o login do próprio Claude Code |
| **Codex** | Logs locais (estimativa por tokens) | Logs do próprio Codex |
| **Cursor** | Painel do cursor.com | — |

**Privacidade:** tudo roda na sua máquina. O token do Claude Code vai só para a Anthropic e o cookie do Cursor só para o cursor.com, guardado no Gerenciador de Credenciais do Windows.

## Instalação

Baixe o `.exe`, coloque numa pasta sua (por exemplo `%LOCALAPPDATA%\CursorUsageWidget`) e execute. Clique com o botão direito no ícone da bandeja e marque **Iniciar com o Windows**.
