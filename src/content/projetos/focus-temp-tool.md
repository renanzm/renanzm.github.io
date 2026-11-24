---
titulo: Focus Temp Tool
resumo: Ferramenta para o painel do Ford Focus Mk2 mostrar a temperatura real do motor, via ELM327.
descricao: Os Focus brasileiros saem de fábrica com o ponteiro de temperatura simulado, parado no meio. A ideia é fazer só a troca para o sensor real, com poucos comandos e com segurança.
destaques:
  - Uma única troca, sem as dezenas de opções do ELM-FF2
  - Gravação travada até os valores serem confirmados num carro real
  - Analisa logs de captura para achar os valores certos
stack: [Python, ELM327, MS-CAN]
plataforma: Linha de comando
data: 2026-11-07
ordem: 5
cor: '#60a5fa'
status: em-desenvolvimento
capa: ../../assets/projetos/focus-temp-tool.svg
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/focus-temp-tool
---

Os Focus Mk2 (C307) brasileiros saem de fábrica com a temperatura **simulada**: o ponteiro fica parado no meio e não mostra o que o motor está fazendo. O painel tem uma configuração interna que passa a usar o sensor real.

O ELM-FF2 já faz essa troca, mas é difícil de usar e cheio de opções que a maioria das pessoas nunca vai precisar. A ideia aqui é fazer **só essa troca**, com poucos comandos e com segurança.

## Em que pé está

> **A ferramenta ainda não faz a troca no carro.** A gravação está travada de propósito até os valores serem confirmados num carro real, porque gravar um valor errado pode corromper a configuração do painel.

| Comando | O que faz | Situação |
|---|---|---|
| `parse-capture` | Analisa um log do ELM-FF2 e ajuda a achar os valores | Funciona com logs de exemplo |
| `scan` | Testa o adaptador e tenta falar com o painel | Pronto, ainda não testado em carro |
| `status` | Mostra se a temperatura está real ou simulada | Em desenvolvimento |
| `set-real` / `set-sim` | Troca entre real e simulada | Travado |

```bash
python focus_temp.py --porta COM3 scan
```

## O que você precisa

- Python 3.8 ou mais novo.
- Um adaptador ELM327 que alcance a rede **MS-CAN** (125 kbit/s), onde fica o painel. Um ELM327 USB simples costuma enxergar só a HS-CAN do motor.

Se você tem um Focus Mk2 e quer ajudar a confirmar os valores, o README do repositório explica como capturar a troca.
