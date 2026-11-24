// Informações pessoais. Tudo no site lê deste arquivo.
export const site = {
  nome: 'Renan Zacaron',
  apelido: 'renanzm',
  cargo: 'Desenvolvedor de software',
  empresa: 'Thomson Reuters',
  cidade: 'Içara, SC',
  // Frase curta do topo da página inicial
  chamada:
    'Trabalho com dados que não podem dar errado e transformo ideias em apps para Windows, ferramentas e, agora, um jogo.',
  // Usada como descrição padrão das páginas (Google, redes sociais)
  descricao:
    'Desenvolvedor de software focado em migração e auditoria de dados, apps para Windows em Rust e Python e um jogo mobile em Godot.',
  bio: [
    'Sou desenvolvedor de software na Thomson Reuters, no ecossistema Domínio Sistemas. Trabalho com conversão, migração, auditoria e validação de dados para sistemas contábeis, de folha de pagamento e eSocial: investigo inconsistências em bancos de dados e conversores, corrijo em Python e SQL e cubro as correções com testes automatizados, com branches, pull requests e releases que deixam cada entrega rastreável.',
    'Mexo com computador desde criança, no tempo do Windows 98, e foi daí que veio a intimidade com o Windows e com software desktop. Nos projetos pessoais, transformo ideias em programas de verdade: um soundboard em Rust que toca sons direto no microfone, um widget com o gasto em agentes de IA, um launcher que instala e atualiza apps, um sistema para uma oficina de airsoft e um jogo mobile em Godot.',
    'Uso IA generativa todos os dias, com Claude, Codex, Cursor, agentes, MCP e RAG, para acelerar diagnósticos e padronizar análises, sem abrir mão de revisão de código e testes.',
  ],
  // Fatos rápidos ao lado da bio
  fatos: [
    { rotulo: 'Hoje', valor: 'Desenvolvedor na Thomson Reuters' },
    { rotulo: 'Foco', valor: 'Migração, ETL e auditoria de dados' },
    { rotulo: 'Domínio', valor: 'Contábil, folha de pagamento e eSocial' },
    { rotulo: 'Base', valor: 'Içara, SC' },
  ],
  // Ícones em public/stack (skill-icons, licença MIT)
  stack: [
    { id: 'py', nome: 'Python' },
    { id: 'rust', nome: 'Rust' },
    { id: 'java', nome: 'Java' },
    { id: 'postgres', nome: 'PostgreSQL' },
    { id: 'sqlite', nome: 'SQLite' },
    { id: 'qt', nome: 'PyQt6' },
    { id: 'tauri', nome: 'Tauri' },
    { id: 'selenium', nome: 'Selenium' },
    { id: 'godot', nome: 'Godot' },
    { id: 'git', nome: 'Git' },
    { id: 'githubactions', nome: 'GitHub Actions' },
    { id: 'windows', nome: 'Windows' },
    { id: 'powershell', nome: 'PowerShell' },
    { id: 'astro', nome: 'Astro' },
  ],
  // Tecnologias sem ícone, mostradas como etiquetas
  extras: [
    'SQL',
    'SQL Server',
    'Oracle',
    'Firebird',
    'Sybase / SQL Anywhere',
    'ODBC',
    'APIs REST',
    'FTP/FTPS',
    'Tkinter',
    'PyInstaller',
    'pytest',
    'Ruff',
    'Snyk',
    'Claude',
    'Codex',
    'Cursor',
    'MCP',
  ],
  email: '', // ex.: 'voce@exemplo.com' (vazio esconde)
  redes: [
    { nome: 'GitHub', url: 'https://github.com/renanzm' },
    { nome: 'LinkedIn', url: 'https://www.linkedin.com/in/renan-zacaron-39a4711ba/' },
  ],
};
