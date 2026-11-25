---
titulo: RZ Airsoft
resumo: Sistema de gestão para oficina de airsoft, com ordens de serviço, quadro da bancada, relatórios técnicos em PDF e clientes.
descricao: Feito sob medida para a oficina RZ Airsoft. Roda no computador da oficina, abre de qualquer lugar pelo navegador e continua funcionando sem internet, sincronizando quando a conexão volta.
destaques:
  - Quadro da bancada para arrastar cada ordem de serviço
  - Relatório técnico em PDF com fotos e FPS antes e depois
  - Funciona offline e junta edições feitas em dois aparelhos
stack: [JavaScript, Python, PWA]
plataforma: Web
data: 2026-11-02
ordem: 4
cor: '#eab308'
capa: ../../assets/projetos/rz-airsoft/painel.webp
galeria:
  - src: ../../assets/projetos/rz-airsoft/quadro.webp
    legenda: Quadro da bancada, com as ordens de serviço por etapa
  - src: ../../assets/projetos/rz-airsoft/os.webp
    legenda: Ordem de serviço com equipamento, serviços e pagamento
  - src: ../../assets/projetos/rz-airsoft/relatorio.webp
    legenda: Relatório técnico com prévia ao vivo do PDF
  - src: ../../assets/projetos/rz-airsoft/cliente.webp
    legenda: Histórico e valores de cada cliente
  - src: ../../assets/projetos/rz-airsoft/servicos.webp
    legenda: Catálogo de serviços e preços
  - src: ../../assets/projetos/rz-airsoft/marketing.webp
    legenda: Banner da oficina para Instagram e WhatsApp
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/rz-airsoft
---

Sistema feito sob medida para a oficina RZ Airsoft. Roda no computador da oficina, com login e senha, e pode ser aberto de qualquer lugar pelo navegador ou instalado como aplicativo no Chrome e no Edge.

> Software proprietário: o código está público para consulta, mas todos os direitos são reservados. As imagens desta página usam dados fictícios.

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
