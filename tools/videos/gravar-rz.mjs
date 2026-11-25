// RZ Airsoft: painel → quadro da bancada (arrasta uma OS) → OS → relatório técnico.
// Sobe o servidor do app numa pasta de dados temporária, com dados fictícios. Os dados reais
// da oficina (dados/cloud) não são lidos nem alterados.
import { spawn } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrirEdge, montarVideo } from './gravador.mjs';
import { popularRz } from './rz-dados.mjs';
import { SAIDA, TEMP, repo, espera, poster } from './config.mjs';

const PORTA = 8790;
const BASE = `http://127.0.0.1:${PORTA}`;
const DADOS = join(TEMP, 'rz-dados');
rmSync(DADOS, { recursive: true, force: true });
mkdirSync(DADOS, { recursive: true });

const servidor = spawn(process.env.PYTHON || 'python', ['server/app.py', '--data-dir', DADOS, '--port', String(PORTA), '--no-browser', '--quiet'], { cwd: repo('rz-airsoft'), stdio: 'ignore' });
try {
  let pronto = false;
  for (let i = 0; i < 50 && !pronto; i++) {
    await espera(200);
    try { pronto = (await fetch(`${BASE}/api/v1/health`)).ok; } catch {}
  }
  if (!pronto) throw new Error('o servidor do RZ Airsoft não subiu');
  const { cookie, ids } = await popularRz(BASE);
  const [nome, valor] = cookie.split('=');

  const b = await abrirEdge({ perfil: join(TEMP, 'perfil-rz'), porta: 9401, cookies: [{ name: nome, value: valor, domain: '127.0.0.1', path: '/', httpOnly: true }] });
  await b.ir(`${BASE}/`, 2000);
  await b.mover(980, 620, 10);
  await b.gravar();

  // 1. Painel: passa pelo gráfico de faturamento e abre o quadro da bancada
  await espera(700);
  await b.mover(1150, 640, 900);
  await b.mover(1360, 700, 700);
  await espera(400);
  const quadro = await b.centro('a, button', 'Quadro da bancada');
  await b.mover(quadro.x, quadro.y, 800);
  await espera(150);
  await b.clicar();
  await espera(1500);

  // 2. Quadro: arrasta a OS do Rafael para "Pronto"
  const cartao = await b.avaliar(`(() => { const c = [...document.querySelectorAll('[data-drop="bancada"] .kcard')].find(e => e.textContent.includes('Rafael Souza')); const r = c.getBoundingClientRect(); return { x: r.left + r.width * 0.45, y: r.top + 40 }; })()`);
  const destino = await b.avaliar(`(() => { const r = document.querySelector('[data-drop="pronto"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 90 }; })()`);
  await b.mover(cartao.x, cartao.y, 900);
  await espera(250);
  await b.arrastar(destino.x, destino.y, 1300);
  await espera(1300);

  // 3. Abre a OS do Lucas
  const lucas = await b.avaliar(`(() => { const c = [...document.querySelectorAll('.kcard')].find(e => e.textContent.includes('Lucas Ferreira')); const r = c.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + 60 }; })()`);
  await b.mover(lucas.x, lucas.y, 900);
  await espera(200);
  await b.clicar();
  await espera(1600);

  // 4. Relatório técnico com a prévia do PDF
  const aba = await b.centro('a, button, [role="tab"]', 'Relatório técnico');
  await b.mover(aba.x, aba.y, 800);
  await espera(150);
  await b.clicar();
  await espera(1500);
  await b.mover(1500, 560, 1400);
  await espera(1600);

  const quadros = await b.parar();
  b.fechar();
  const video = join(SAIDA, 'rz-airsoft.mp4');
  const dur = montarVideo(quadros, video, { pasta: join(TEMP, 'quadros-rz'), cortarInicio: 0.2, velocidade: 1.25, minimo: 13 });
  poster(video, join(SAIDA, 'rz-airsoft.webp'), 0.8);
  console.log(`rz-airsoft: ${dur.toFixed(1)} s (ids ${JSON.stringify(ids)})`);
} finally {
  servidor.kill();
}
