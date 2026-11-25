// Focus Temp Tool: sessão de terminal com as saídas reais da ferramenta.
// Roda os comandos de verdade (ajuda, análise do log de exemplo do README e a trava do set-real)
// e grava um terminal que digita cada comando e mostra a saída.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirEdge, montarVideo } from './gravador.mjs';
import { SAIDA, TEMP, repo, espera, poster } from './config.mjs';

const PASTA = repo('focus-temp-tool');
const PYTHON = process.env.PYTHON || 'python';
// Log de exemplo do README (valores fictícios, só para mostrar o formato)
const captura = join(TEMP, 'captura-exemplo.txt');
writeFileSync(captura, [
  '>> ATSH720', '<< OK',
  '>> 2101', '<< 728 06 61 01 AA BB CC 04',
  '>> 2701', '<< 728 04 67 01 12 34',
  '>> 3B01AABBCC14', '<< 728 02 7B 01',
].join('\n') + '\n');
const rodar = (...args) => {
  try {
    return execFileSync(PYTHON, ['focus_temp.py', ...args], { cwd: PASTA, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).toString();
  } catch (e) {
    return String(e.stdout || '') + String(e.stderr || ''); // o set-real termina com erro de propósito (trava)
  }
};
const limpar = (s) => s.replace(/\r/g, '').replace(/\n+$/, '');
const SESSAO = [
  { cmd: 'python focus_temp.py --help', saida: limpar(rodar('--help')) },
  { cmd: 'python focus_temp.py parse-capture captura.txt', saida: limpar(rodar('parse-capture', captura)) },
  { cmd: 'python focus_temp.py --porta COM3 set-real', saida: limpar(rodar('--porta', 'COM3', 'set-real')) },
];

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; background: radial-gradient(70% 80% at 70% 30%, rgba(96,165,250,.12), transparent 70%), #0a0d13; overflow: hidden; }
  .janela { position: absolute; inset: 44px 56px; border-radius: 12px; background: #0c0c0c; border: 1px solid #2a2f37;
    box-shadow: 0 30px 90px rgba(0,0,0,.6); overflow: hidden; display: flex; flex-direction: column; }
  .barra { height: 42px; background: #1f1f1f; display: flex; align-items: center; padding: 0 0 0 12px; gap: 10px;
    font: 13px 'Segoe UI', system-ui, sans-serif; color: #cfcfcf; flex: none; }
  .aba { display: flex; align-items: center; gap: 8px; height: 32px; margin-top: 10px; padding: 0 14px; background: #0c0c0c; border-radius: 8px 8px 0 0; }
  .aba i { width: 12px; height: 12px; border-radius: 3px; background: #2f6fd6; display: inline-block; }
  .ctl { margin-left: auto; display: flex; }
  .ctl span { width: 46px; text-align: center; color: #9a9a9a; font-size: 14px; }
  .tela { flex: 1; padding: 16px 22px; font: 17px/1.5 'Cascadia Mono', Consolas, monospace; color: #cccccc; white-space: pre; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
  .ps { color: #cccccc; } .cmd { color: #f2f2f2; }
  .cursor { display: inline-block; width: .6em; height: 1.1em; vertical-align: -0.15em; background: #cccccc; animation: pisca 1s steps(1) infinite; }
  @keyframes pisca { 50% { opacity: 0; } }
</style></head><body>
<div class="janela"><div class="barra"><div class="aba"><i></i>Windows PowerShell</div><div class="ctl"><span>—</span><span>☐</span><span>✕</span></div></div>
<div class="tela" id="t"></div></div>
<script>
  const SESSAO = ${JSON.stringify(SESSAO)};
  const PROMPT = 'PS C:\\\\focus-temp-tool> ';
  const t = document.getElementById('t');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  let linhaAtual;
  const novaLinha = () => { linhaAtual = document.createElement('div'); t.appendChild(linhaAtual); return linhaAtual; };
  const cursor = document.createElement('span'); cursor.className = 'cursor';
  function prompt() { const l = novaLinha(); const p = document.createElement('span'); p.className = 'ps'; p.textContent = PROMPT; l.append(p, cursor); return l; }
  prompt();
  window.__rodar = async () => {
    for (const passo of SESSAO) {
      const l = linhaAtual;
      const c = document.createElement('span'); c.className = 'cmd'; l.insertBefore(c, cursor);
      for (const ch of passo.cmd) { c.textContent += ch; await esperar(32 + Math.random() * 38); }
      await esperar(260);
      cursor.remove();
      for (const linha of passo.saida.split('\\n')) { novaLinha().textContent = linha || ' '; await esperar(22); }
      novaLinha().textContent = ' ';
      prompt();
      await esperar(1500);
    }
    window.__fim = true;
  };
</script></body></html>`;
const arquivo = join(TEMP, 'terminal-focus.html');
writeFileSync(arquivo, html);

const b = await abrirEdge({ perfil: join(TEMP, 'perfil-focus'), porta: 9403, largura: 1280, altura: 800, escala: 1.5, cursor: false });
await b.ir(pathToFileURL(arquivo).href, 800);
await b.gravar();
await espera(900);
await b.avaliar('__rodar(), true');
// Checa a cada 1 s: checar mais rápido atrapalhava a página no headless
for (let i = 0; i < 40; i++) { await espera(1000); if (await b.avaliar('!!window.__fim')) break; }
await espera(600);
const quadros = await b.parar();
b.fechar();
const video = join(SAIDA, 'focus-temp-tool.mp4');
const dur = montarVideo(quadros, video, { pasta: join(TEMP, 'quadros-focus'), cortarInicio: 0.2, minimo: 13 });
poster(video, join(SAIDA, 'focus-temp-tool.webp'), 9);
console.log(`focus-temp-tool: ${dur.toFixed(1)} s`);
