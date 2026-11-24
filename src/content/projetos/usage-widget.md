---
titulo: Usage Widget
resumo: Widget para a área de trabalho do Windows que mostra o gasto e os limites do plano no Claude Code, no Codex e no Cursor.
data: 2026-11-24
tags: [windows, rust, desktop, ia]
destaque: true
capa: /capas/usage-widget.png
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
