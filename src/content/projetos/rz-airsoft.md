---
titulo: RZ Airsoft
resumo: Sistema de gestão para oficina de airsoft, com ordens de serviço, quadro da bancada, relatórios técnicos em PDF e clientes.
data: 2026-11-02
tags: [web, javascript, python, gestão]
capa: /capas/rz-airsoft.png
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/rz-airsoft
---

Sistema feito sob medida para a oficina RZ Airsoft. Roda no computador da oficina, com login e senha, e pode ser aberto de qualquer lugar pelo navegador ou instalado como aplicativo no Chrome e no Edge.

> Software proprietário: o código está público para consulta, mas todos os direitos são reservados.

## Telas

- **Painel:** faturamento do mês e dos últimos 12 meses, valores a receber, OS em aberto e próximas entregas.
- **Ordens de serviço:** lista com busca, filtros e exportação, ou **quadro** da bancada para arrastar a OS entre *Na fila → Na bancada → Aguardando peças → Pronto → Entregue*.
- **Detalhe da OS:** equipamento, serviços e peças do catálogo, FPS antes e depois com joules calculados, pagamento, garantia e histórico.
- **Relatório técnico:** formulário com prévia ao vivo do PDF, com até 6 fotos (inclusive da câmera do celular).
- **Clientes, catálogo de serviços e preços, banner para Instagram e WhatsApp.**

## Detalhes técnicos

- Acesso remoto por túnel da Cloudflare, sem abrir portas no roteador.
- Edição simultânea em dois aparelhos, com junção de campos quando a mesma OS muda nos dois.
- Funciona offline: as alterações ficam guardadas no navegador e sobem quando o servidor volta.
- Backups automáticos a cada 10 minutos de uso e backup completo em `.zip`.
- Atalhos de teclado (`Ctrl+K` para buscar qualquer coisa) e interface em português e inglês.
