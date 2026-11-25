// Regrava os mini vídeos dos apps. Uso:
//   node tools/videos/gravar.mjs rz widget focus      (só alguns)
//   node tools/videos/gravar.mjs todos                 (todos)
// Veja tools/videos/README.md para o que cada um precisa.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { AQUI, SAIDA } from './config.mjs';

// [script, limite de tempo por tentativa em segundos]
const SCRIPTS = {
  soundmod: ['gravar-soundmod.mjs', 180],
  widget: ['gravar-widget.mjs', 120],
  launcher: ['gravar-launcher.mjs', 240],
  rz: ['gravar-rz.mjs', 150],
  focus: ['gravar-focus.mjs', 120],
  jogo: ['gravar-jogo.mjs', 600],
  'soundmod-python': ['print-soundmod-python.mjs', 120],
};
// O Edge headless às vezes para de mandar quadros no meio de uma gravação; repetir resolve
const TENTATIVAS = 3;

let pedidos = process.argv.slice(2);
if (!pedidos.length) {
  console.log(`Uso: node tools/videos/gravar.mjs <${Object.keys(SCRIPTS).join('|')}|todos> ...`);
  process.exit(1);
}
if (pedidos.includes('todos')) pedidos = Object.keys(SCRIPTS).filter((k) => k !== 'soundmod-python');
const desconhecidos = pedidos.filter((p) => !SCRIPTS[p]);
if (desconhecidos.length) throw new Error(`não conheço: ${desconhecidos.join(', ')}`);

console.log(`Saída: ${SAIDA}`);
const falhas = [];
for (const p of pedidos) {
  const [script, limite] = SCRIPTS[p];
  let ok = false;
  for (let tentativa = 1; tentativa <= TENTATIVAS && !ok; tentativa++) {
    console.log(`\n▶ ${p}${tentativa > 1 ? ` (tentativa ${tentativa})` : ''}`);
    const r = spawnSync(process.execPath, [join(AQUI, script)], { stdio: 'inherit', timeout: limite * 1000, killSignal: 'SIGKILL' });
    ok = r.status === 0;
    if (!ok) console.log(r.error?.code === 'ETIMEDOUT' ? `  passou de ${limite} s` : `  falhou (código ${r.status})`);
  }
  if (!ok) falhas.push(p);
}
if (falhas.length) {
  console.log(`\nFalharam: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('\nPronto. Confira os vídeos e rode o site (npm run dev) para ver o resultado.');
