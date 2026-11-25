// Gravador de demonstrações no navegador: Edge headless + DevTools Protocol + ffmpeg.
// Captura os quadros do screencast com o horário de cada um e monta um MP4 a 30 fps.
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { EDGE, FFMPEG, espera } from './config.mjs';

// Cursor desenhado na própria página (o headless não mostra o do sistema)
const CURSOR = `(() => {
  const instalar = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 2 L4 21 L9 16.5 L12.5 24 L16 22.5 L12.6 15.2 L19 15.2 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.45))' });
    document.documentElement.appendChild(c);
    const anel = document.createElement('div');
    Object.assign(anel.style, { position: 'fixed', left: '0', top: '0', width: '34px', height: '34px', margin: '-17px 0 0 -17px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.85)', zIndex: 2147483646, pointerEvents: 'none', opacity: '0' });
    document.documentElement.appendChild(anel);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
    addEventListener('mousedown', (e) => {
      anel.style.transition = 'none'; anel.style.left = e.clientX + 'px'; anel.style.top = e.clientY + 'px';
      anel.style.opacity = '1'; anel.style.transform = 'scale(.4)';
      requestAnimationFrame(() => requestAnimationFrame(() => { anel.style.transition = 'transform .45s ease-out, opacity .45s ease-out'; anel.style.transform = 'scale(1.3)'; anel.style.opacity = '0'; }));
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalar); else instalar();
})();`;

/** Uma porta do DevTools que ainda não esteja em uso (um Edge que sobrou pode ocupar a padrão). */
async function portaLivre(inicial) {
  for (let porta = inicial; porta < inicial + 50; porta++) {
    try {
      await fetch(`http://127.0.0.1:${porta}/json/version`, { signal: AbortSignal.timeout(400) });
    } catch {
      return porta; // ninguém respondeu: livre
    }
  }
  throw new Error('nenhuma porta livre para o DevTools');
}

export async function abrirEdge({ largura = 1440, altura = 900, escala = 1, porta: portaInicial = 9400, perfil, cursor = true, cookies = [] }) {
  const porta = await portaLivre(portaInicial);
  rmSync(perfil, { recursive: true, force: true });
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`,
    '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', `--window-size=${largura},${altura}`,
    // Sem isso, janelas de outros apps abrindo e fechando fazem o Edge achar que está encoberto
    // e parar de produzir quadros no meio da gravação
    '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    'about:blank',
  ], { stdio: 'ignore' });
  process.on('exit', () => edge.kill()); // não deixa Edge sobrando se o script cair
  let alvo;
  for (let i = 0; i < 60 && !alvo; i++) {
    await espera(200);
    try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!alvo) throw new Error('Edge não respondeu');
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let n = 0;
  const pend = new Map();
  const ouvintes = new Set();
  let fechado = false;
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); clearTimeout(p.limite); m.error ? p.erro(new Error(m.error.message)) : p.ok(m.result); }
    else if (m.method) for (const o of ouvintes) o(m);
  });
  // Se o Edge cair, tudo o que está esperando falha na hora (em vez de travar o script)
  ws.addEventListener('close', () => {
    fechado = true;
    for (const p of pend.values()) { clearTimeout(p.limite); p.erro(new Error('o Edge fechou no meio da gravação')); }
    pend.clear();
  });
  const cdp = (method, params = {}) => new Promise((ok, erro) => {
    if (fechado) return erro(new Error('o Edge já fechou'));
    const id = ++n;
    const limite = setTimeout(() => { pend.delete(id); erro(new Error(`sem resposta do Edge para ${method}`)); }, 30000);
    pend.set(id, { ok, erro, limite });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const avaliar = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro no script');
    return r.result.value;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  for (const c of cookies) await cdp('Network.setCookie', c);
  await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: escala, mobile: false });
  if (cursor) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: CURSOR });

  const ir = async (url, extraMs = 1200) => {
    const carregou = new Promise((r, erro) => {
      const limite = setTimeout(() => erro(new Error(`a página não carregou: ${url}`)), 30000);
      const f = (m) => { if (m.method === 'Page.loadEventFired') { ouvintes.delete(f); clearTimeout(limite); r(); } };
      ouvintes.add(f);
    });
    await cdp('Page.navigate', { url });
    await carregou;
    await espera(extraMs);
  };

  // Mouse com trajetória suave (easeInOutCubic)
  let mx = largura / 2, my = altura / 2;
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mover = async (x, y, ms = 700, segurando = false) => {
    const x0 = mx, y0 = my, passos = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= passos; i++) {
      const t = suave(i / passos);
      mx = x0 + (x - x0) * t; my = y0 + (y - y0) * t;
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: segurando ? 'left' : 'none', buttons: segurando ? 1 : 0 });
      await espera(16);
    }
  };
  const clicar = async (pausa = 90) => {
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', buttons: 1, clickCount: 1 });
    await espera(pausa);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button: 'left', buttons: 0, clickCount: 1 });
  };
  const arrastar = async (x, y, ms = 1100) => {
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', buttons: 1, clickCount: 1 });
    await espera(120);
    await mover(x, y, ms, true);
    await espera(150);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx, y: my, button: 'left', buttons: 0, clickCount: 1 });
  };
  /** Centro de um elemento (seletor CSS e, opcionalmente, um texto que ele contém). */
  const centro = (seletor, texto) => avaliar(`(() => {
    const els = [...document.querySelectorAll(${JSON.stringify(seletor)})];
    const el = ${texto ? `els.find((e) => e.textContent.includes(${JSON.stringify(texto)}))` : 'els[0]'};
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);

  // Gravação: screencast com o horário de cada quadro
  let quadros = [];
  let gravando = false;
  ouvintes.add((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    cdp('Page.screencastFrameAck', { sessionId: m.params.sessionId });
    if (gravando) quadros.push({ t: m.params.metadata.timestamp, data: m.params.data });
  });
  const gravar = async () => {
    quadros = [];
    gravando = true;
    await cdp('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: largura * escala, maxHeight: altura * escala, everyNthFrame: 1 });
    await espera(300);
  };
  const parar = async () => {
    await espera(400);
    gravando = false;
    await cdp('Page.stopScreencast');
    if (!quadros.length) throw new Error('o Edge não mandou nenhum quadro');
    return quadros;
  };

  const fechar = () => { ws.close(); edge.kill(); };
  return { cdp, avaliar, ir, mover, clicar, arrastar, centro, gravar, parar, fechar };
}

/**
 * Monta um MP4 (H.264, 30 fps, sem áudio) a partir dos quadros com horário.
 * cortarInicio/cortarFim em segundos; velocidade > 1 acelera.
 */
export function montarVideo(quadros, saida, { pasta, largura = 1280, cortarInicio = 0, cortarFim = 0, crf = 24, fade = 0.35, velocidade = 1, minimo = 0 } = {}) {
  // O screencast às vezes para de mandar quadros no meio: vídeo mais curto que o roteiro = gravação cortada
  const bruto = (quadros.at(-1).t - quadros[0].t) / velocidade;
  if (bruto < minimo) throw new Error(`gravação cortada: ${bruto.toFixed(1)} s, o roteiro tem pelo menos ${minimo} s`);
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  const t0 = quadros[0].t;
  const usados = quadros.filter((q) => q.t - t0 >= cortarInicio);
  const tFim = quadros.at(-1).t - cortarFim;
  const lista = ['ffconcat version 1.0'];
  usados.forEach((q, i) => {
    if (q.t > tFim) return;
    const nome = `q${String(i).padStart(5, '0')}.jpg`;
    writeFileSync(join(pasta, nome), Buffer.from(q.data, 'base64'));
    const prox = usados[i + 1];
    const dur = prox ? Math.min(prox.t, tFim) - q.t : 0.5;
    lista.push(`file '${nome}'`, `duration ${Math.max(dur, 0.001).toFixed(4)}`);
  });
  lista.push(lista.at(-2)); // o concat ignora a duração do último arquivo
  writeFileSync(join(pasta, 'lista.txt'), lista.join('\n'));
  const total = (Math.min(tFim, usados.at(-1).t) - usados[0].t + 0.5) / velocidade;
  const vf = [`setpts=PTS/${velocidade}`, 'fps=30', `scale=${largura}:-2:flags=lanczos`];
  if (fade) vf.push(`fade=t=in:st=0:d=${fade}`, `fade=t=out:st=${Math.max(0, total - fade).toFixed(2)}:d=${fade}`);
  vf.push('format=yuv420p');
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(pasta, 'lista.txt'), '-vf', vf.join(','), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-movflags', '+faststart', '-an', saida]);
  return total;
}
