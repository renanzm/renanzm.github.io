// Usage Widget: a interface real (pasta ui/) com a ponte do Tauri simulada e dados fictícios que mudam ao vivo.
// Aba recolhida → passa o mouse → painel abre → gasto sobe → tema claro → recolhe → volta ao escuro.
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirEdge, montarVideo } from './gravador.mjs';
import { SAIDA, TEMP, repo, espera, poster } from './config.mjs';

const UI = join(repo('cursor-usage-widget'), 'ui');
const PALCO = join(TEMP, 'palco-widget');
rmSync(PALCO, { recursive: true, force: true });
mkdirSync(PALCO, { recursive: true });
cpSync(UI, PALCO, { recursive: true });

const PONTE = `<script>
(() => {
  const now = Date.now(), H = 3600000;
  const snap = {
    status: 'ok', source: 'claude', message: null,
    cycleUsedUsd: 296.8, cycleLimitUsd: 1000,
    cycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    cycleEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    windowUsd: 14.6, windowEvents: 28, ratePerHour: 4.6, windowHours: 3, level: 'low',
    lowMax: 6, highMin: 13, rateMax: 20, weekUsd: [46, 88, 38, null, null], weekToday: 2, dayMaxUsd: 100,
    updatedAtMs: now, limit5hPct: 31, limit5hResetsMs: now + 2.6 * H, limit7dPct: 58, limit7dResetsMs: now + 3.4 * 24 * H,
    limitsUpdatedMs: now,
  };
  const cores = { accent: '#ff9f0a', low: '#30d158', mid: '#ffd60a', high: '#ff453a' };
  window.__snap = snap;
  window.__settings = { theme: 'dark', side: 'right', colors: cores };
  window.__ouvintes = {};
  window.__TAURI__ = {
    core: { invoke: async (cmd, args) => {
      if (cmd === 'get_snapshot') return window.__snap;
      if (cmd === 'get_settings') return window.__settings;
      if (cmd === 'get_lang') return 'pt';
      if (cmd === 'set_expanded') { document.getElementById('w').style.setProperty('--altura', (args && args.height || 620) + 'px'); return null; }
      return null;
    } },
    event: { listen: async (nome, cb) => { (window.__ouvintes[nome] ||= []).push(cb); return () => {}; } },
  };
  window.__emitir = (nome, payload) => (window.__ouvintes[nome] || []).forEach((cb) => cb({ payload }));
  // Terminal de fundo (cenário): um agente trabalhando enquanto o gasto sobe no widget
  const LINHAS = [
    ['eu', '> Refatore o módulo de relatórios e escreva os testes'],
    ['ok', '● Lendo 14 arquivos em src/relatorios'],
    ['ok', '● Editando exportar.py  +86 −41'],
    ['ok', '● Editando filtros.py  +23 −9'],
    ['ok', '● Criando tests/test_exportar.py'],
    ['ok', '● Rodando a suíte de testes'],
    ['fim', '  42 testes passaram em 3,1 s'],
  ];
  addEventListener('DOMContentLoaded', () => {
    const t = document.createElement('div');
    t.id = 'palco-terminal';
    t.innerHTML = '<div class="barra"><i></i><i></i><i></i><span>Terminal</span></div><div class="linhas"><div class="l eu">$ agente</div></div>';
    document.body.appendChild(t);
  });
  window.__linha = (i) => {
    const l = LINHAS[i];
    if (!l) return;
    const d = document.createElement('div');
    d.className = 'l ' + l[0];
    d.textContent = l[1];
    document.querySelector('#palco-terminal .linhas').appendChild(d);
  };
  // Uso acontecendo: o gasto sobe aos poucos e o ritmo passa de baixo para médio
  window.__fluxo = () => {
    let passo = 0;
    __linha(0);
    const id = setInterval(() => {
      passo++;
      if (passo % 2 === 0) __linha(passo / 2);
      const s = { ...window.__snap, weekUsd: [...window.__snap.weekUsd] };
      s.ratePerHour = +(s.ratePerHour + 0.32).toFixed(2);
      s.level = s.ratePerHour >= s.highMin ? 'high' : s.ratePerHour > s.lowMax ? 'mid' : 'low';
      s.windowUsd = +(s.windowUsd + 0.55).toFixed(2);
      s.windowEvents += 1;
      s.cycleUsedUsd = +(s.cycleUsedUsd + 0.6).toFixed(2);
      s.limit5hPct = Math.min(99, +(s.limit5hPct + 0.9).toFixed(1));
      s.limit7dPct = +(s.limit7dPct + 0.15).toFixed(2);
      s.weekUsd[2] = +(s.weekUsd[2] + 1.6).toFixed(1);
      s.updatedAtMs = Date.now();
      window.__snap = s;
      window.__emitir('usage', s);
      if (passo >= 16) clearInterval(id);
    }, 280);
  };
  window.__tema = (tema) => { window.__settings = { ...window.__settings, theme: tema }; window.__emitir('settings', window.__settings); };
})();
</script>
<style>
  html, body { width: 100% !important; height: 100% !important; overflow: hidden !important;
    background:
      radial-gradient(60% 70% at 18% 25%, rgba(56, 189, 248, .16), transparent 70%),
      radial-gradient(55% 60% at 70% 85%, rgba(168, 85, 247, .16), transparent 70%),
      radial-gradient(40% 50% at 85% 20%, rgba(255, 159, 10, .10), transparent 70%),
      #0b0e14 !important; }
  #w { position: fixed !important; right: 0 !important; top: 50% !important; left: auto !important; bottom: auto !important;
    width: 56px !important; height: 128px !important; translate: 0 -50%; zoom: 1.25;
    transition: width .22s cubic-bezier(.2,.8,.2,1), height .22s cubic-bezier(.2,.8,.2,1); }
  #w.expanded { width: 272px !important; height: var(--altura, 620px) !important; }
  #palco-terminal { position: fixed; left: 70px; top: 96px; width: 720px; height: 560px; border-radius: 14px;
    background: rgba(13, 17, 23, .86); border: 1px solid rgba(255,255,255,.09); box-shadow: 0 30px 80px rgba(0,0,0,.55);
    font: 15px/1.75 'Cascadia Mono', Consolas, ui-monospace, monospace; color: #c9d1d9; overflow: hidden; z-index: 0; }
  #palco-terminal .barra { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px;
    border-bottom: 1px solid rgba(255,255,255,.06); color: #6e7681; font-size: 13px; }
  #palco-terminal .barra i { width: 11px; height: 11px; border-radius: 50%; background: #2d333b; }
  #palco-terminal .barra span { margin-left: 10px; }
  #palco-terminal .linhas { padding: 18px 22px; }
  #palco-terminal .l { white-space: pre; animation: entra .3s ease-out both; }
  #palco-terminal .eu { color: #e6edf3; }
  #palco-terminal .ok { color: #8b949e; }
  #palco-terminal .ok::first-letter { color: #ff9f0a; }
  #palco-terminal .fim { color: #3fb950; }
  @keyframes entra { from { opacity: 0; transform: translateY(6px); } }
  #w { z-index: 2; }
</style>`;

const index = join(PALCO, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replace('<script src="app.js">', PONTE + '<script src="app.js">'));

const b = await abrirEdge({ perfil: join(TEMP, 'perfil-widget'), porta: 9402, largura: 1280, altura: 800, escala: 1.5 });
await b.ir(pathToFileURL(index).href, 1500);
// O hover de verdade abriria o painel quando o cursor entra na página; quem controla aqui é o roteiro
await b.avaliar(`document.removeEventListener('mouseenter', expand); document.removeEventListener('mouseleave', collapseSoon); document.getElementById('w').removeEventListener('mouseenter', expand); true`);
await b.mover(760, 520, 10);
await b.gravar();

await espera(1100);
const aba = await b.centro('#w');
await b.mover(aba.x - 8, aba.y, 900);
await b.avaliar('expand(), true');
await espera(900);
await b.avaliar('__fluxo(), true');
await b.mover(aba.x - 150, aba.y + 60, 900);
await espera(3400);
await b.avaliar(`__tema('light'), true`);
await espera(2200);
await b.mover(760, 560, 900);
await b.avaliar('collapseSoon(), true');
await espera(1300);
await b.avaliar(`__tema('dark'), true`);
await espera(1200);

const quadros = await b.parar();
b.fechar();
const video = join(SAIDA, 'usage-widget.mp4');
const dur = montarVideo(quadros, video, { pasta: join(TEMP, 'quadros-widget'), cortarInicio: 0.2, minimo: 11 });
poster(video, join(SAIDA, 'usage-widget.webp'), 3.2);
console.log(`ok: ${quadros.length} quadros, ${dur.toFixed(1)} s`);
