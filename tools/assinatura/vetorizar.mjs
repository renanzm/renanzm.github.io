/* Vetoriza a assinatura: PNG com fundo transparente → traços SVG na ordem em que a caneta passa.
 * A página inicial desenha esses traços um a um (DrawSVG), como se a assinatura fosse feita na hora.
 *
 * Uso: node tools/assinatura/vetorizar.mjs [--depurar]
 * Com --depurar, grava também depuracao.png (cada traço numa cor, com o número da ordem). */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ENTRADA = fileURLToPath(new URL('./assinatura.png', import.meta.url));
const SAIDA = fileURLToPath(new URL('../../src/landing/tracos-assinatura.ts', import.meta.url));
const DEPURACAO = fileURLToPath(new URL('./depuracao.png', import.meta.url));
const DEPURAR = process.argv.includes('--depurar');

/* ------------------------------------------------------------ 1. máscara da tinta */
const { data, info } = await sharp(ENTRADA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const tinta = new Uint8Array(N);
for (let i = 0; i < N; i++) tinta[i] = data[i * info.channels + info.channels - 1] >= 100 ? 1 : 0;

const VIZ8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const VIZ4 = VIZ8.slice(0, 4);
const ANEL = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const xy = (p) => [p % W, (p / W) | 0];

/** Componentes conexos dos pixels com `valor` na máscara. */
function componentes(mascara, valor, viz) {
  const rotulo = new Int32Array(N).fill(-1);
  const lista = [];
  for (let i = 0; i < N; i++) {
    if (mascara[i] !== valor || rotulo[i] !== -1) continue;
    const comp = [i];
    rotulo[i] = lista.length;
    for (let k = 0; k < comp.length; k++) {
      const [x, y] = xy(comp[k]);
      for (const [dx, dy] of viz) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (mascara[q] === valor && rotulo[q] === -1) {
          rotulo[q] = lista.length;
          comp.push(q);
        }
      }
    }
    lista.push(comp);
  }
  return { rotulo, lista };
}

// Sujeira solta sai; furinhos dentro do traço são tapados
for (const c of componentes(tinta, 1, VIZ8).lista) if (c.length < 3) for (const p of c) tinta[p] = 0;
for (const c of componentes(tinta, 0, VIZ4).lista) {
  const borda = c.some((p) => {
    const [x, y] = xy(p);
    return x === 0 || y === 0 || x === W - 1 || y === H - 1;
  });
  if (!borda && c.length <= 6) for (const p of c) tinta[p] = 1;
}

/* ------------------------------------------- 2. espessura (distância ao fundo, chanfro 3-4) */
const dist = new Float32Array(N);
{
  const d = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : dist[y * W + x]);
  for (let i = 0; i < N; i++) dist[i] = tinta[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!tinta[i]) continue;
      dist[i] = Math.min(dist[i], d(x - 1, y) + 3, d(x, y - 1) + 3, d(x - 1, y - 1) + 4, d(x + 1, y - 1) + 4);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (!tinta[i]) continue;
      dist[i] = Math.min(dist[i], d(x + 1, y) + 3, d(x, y + 1) + 3, d(x + 1, y + 1) + 4, d(x - 1, y + 1) + 4);
    }
  for (let i = 0; i < N; i++) dist[i] /= 3;
}
/** Largura do traço em volta de um pixel do esqueleto. */
const larguraEm = (p) => Math.max(1, 2 * dist[p] - 1);

/** Largura pela tinta num disco em volta do ponto: não depende da inclinação do traço
 * (com raio 3, um traço de 1 px dá ~1, um de 3 px dá ~2,8; o tracejado do traço fino dá menos de 1).
 * O raio cresce com a espessura da assinatura (ver ESPESSURA, depois do esqueleto). */
let RAIO_DISCO = 3;
let disco = [];
function montarDisco(raio) {
  RAIO_DISCO = raio;
  disco = [];
  for (let dy = -raio; dy <= raio; dy++)
    for (let dx = -raio; dx <= raio; dx++) if (dx * dx + dy * dy <= raio * raio) disco.push([dx, dy]);
}
function larguraLocal(x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let soma = 0;
  for (const [dx, dy] of disco) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    soma += data[(ny * W + nx) * info.channels + info.channels - 1] / 255;
  }
  return soma / (2 * RAIO_DISCO);
}

/* ------------------------------------------------------- 3. esqueleto (Zhang-Suen) */
const esq = tinta.slice();
const em = (x, y) => x >= 0 && y >= 0 && x < W && y < H && esq[y * W + x] === 1;
{
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const passo of [0, 1]) {
      const apagar = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!esq[y * W + x]) continue;
          const v = ANEL.map(([dx, dy]) => (em(x + dx, y + dy) ? 1 : 0)); // p2..p9
          const b = v.reduce((a, c) => a + c, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let k = 0; k < 8; k++) if (!v[k] && v[(k + 1) % 8]) a++;
          if (a !== 1) continue;
          const [p2, , p4, , p6, , p8] = v;
          if (passo === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          apagar.push(y * W + x);
        }
      for (const i of apagar) esq[i] = 0;
      if (apagar.length) mudou = true;
    }
  }
  // Degraus: um pixel cujos dois vizinhos já se tocam na diagonal sobra
  let limpou = true;
  while (limpou) {
    limpou = false;
    for (let i = 0; i < N; i++) {
      if (!esq[i]) continue;
      const [x, y] = xy(i);
      const viz = VIZ8.filter(([dx, dy]) => em(x + dx, y + dy));
      if (viz.length !== 2) continue;
      const [[ax, ay], [bx, by]] = viz;
      const ortogonais = (ax === 0) !== (bx === 0) && (ay === 0) !== (by === 0);
      if (ortogonais && Math.abs(ax - bx) === 1 && Math.abs(ay - by) === 1) {
        esq[i] = 0;
        limpou = true;
      }
    }
  }
}

/* Espessura típica do traço (tinta ÷ comprimento do esqueleto). Os limites em pixels abaixo
 * acompanham ela: uma assinatura de traço grosso tem cruzamentos e pontas maiores. */
const ESPESSURA = tinta.reduce((s, v) => s + v, 0) / Math.max(1, esq.reduce((s, v) => s + v, 0));
montarDisco(Math.max(3, Math.ceil(ESPESSURA * 0.75)));
console.log(`espessura típica ${ESPESSURA.toFixed(1)} px`);

/* --------------------------------------------- 4. grafo: junções e trechos entre elas */
// Sem os degraus, todo pixel com 3 ou mais vizinhos é onde traços se encontram
const grauEsq = (p) => {
  const [x, y] = xy(p);
  return VIZ8.reduce((n, [dx, dy]) => n + (em(x + dx, y + dy) ? 1 : 0), 0);
};
const juncao = new Uint8Array(N);
for (let i = 0; i < N; i++) if (esq[i] && grauEsq(i) >= 3) juncao[i] = 1;

// Nós = grupos de pixels de junção encostados
const grupos = componentes(juncao, 1, VIZ8);
const pai = grupos.lista.map((_, i) => i);
const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
const unir = (a, b) => (pai[raiz(a)] = raiz(b));

// Trechos = o esqueleto sem as junções
const resto = new Uint8Array(N);
for (let i = 0; i < N; i++) resto[i] = esq[i] && !juncao[i] ? 1 : 0;
const trechosBrutos = componentes(resto, 1, VIZ8).lista;

/** Caminho mais longo dentro de um trecho (dupla busca em largura), em ordem. */
function ordenar(comp) {
  if (comp.length === 1) return comp;
  const dentro = new Set(comp);
  const vizDentro = (p) => {
    const [x, y] = xy(p);
    return VIZ8.map(([dx, dy]) => (y + dy) * W + x + dx).filter(
      (q, k) => dentro.has(q) && Math.abs(((q % W) - x)) <= 1 && VIZ8[k] !== undefined,
    );
  };
  const bfs = (ini) => {
    const anterior = new Map([[ini, -1]]);
    const fila = [ini];
    for (let k = 0; k < fila.length; k++) for (const q of vizDentro(fila[k])) if (!anterior.has(q)) anterior.set(q, fila[k]), fila.push(q);
    return { ultimo: fila[fila.length - 1], anterior };
  };
  let pontas = comp.filter((p) => vizDentro(p).length <= 1);
  let fechado = false;
  let corte = -1;
  if (!pontas.length) {
    // Laço fechado: corta no pixel mais à esquerda e fecha de novo no fim
    fechado = true;
    corte = comp.reduce((m, p) => (p % W < m % W ? p : m), comp[0]);
    dentro.delete(corte);
    pontas = [...dentro].filter((p) => vizDentro(p).length <= 1);
  }
  const ini = pontas[0] ?? [...dentro][0];
  const a = bfs(ini).ultimo;
  const { ultimo: b, anterior } = bfs(a);
  const caminho = [];
  for (let p = b; p !== -1; p = anterior.get(p)) caminho.push(p);
  return fechado ? [corte, ...caminho, corte] : caminho;
}

/** Grupo de junção encostado num pixel (ou -1). Se encosta em dois, eles viram um nó só. */
function grupoVizinho(p) {
  const [x, y] = xy(p);
  let achou = -1;
  for (const [dx, dy] of VIZ8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const q = ny * W + nx;
    if (!juncao[q]) continue;
    const g = grupos.rotulo[q];
    if (achou < 0) achou = g;
    else if (raiz(g) !== raiz(achou)) unir(g, achou);
  }
  return achou;
}

let arestas = trechosBrutos.map((comp) => {
  const px = ordenar(comp);
  const fechadoSozinho = px.length > 2 && px[0] === px[px.length - 1];
  return {
    px,
    a: fechadoSozinho ? -1 : grupoVizinho(px[0]),
    b: fechadoSozinho ? -1 : grupoVizinho(px[px.length - 1]),
  };
});
// Grupos de junção que não encostam em trecho nenhum (pontinhos isolados) viram arestas de um pixel
for (const comp of grupos.lista) {
  const isolado = comp.every((p) => {
    const [x, y] = xy(p);
    return VIZ8.every(([dx, dy]) => !em(x + dx, y + dy) || juncao[(y + dy) * W + x + dx]);
  });
  if (isolado) arestas.push({ px: [comp[0]], a: -1, b: -1 });
}

// Trechos curtíssimos entre duas junções: as junções viram um nó só (cruzamento em X)
arestas = arestas.filter((e) => {
  if (e.a >= 0 && e.b >= 0 && e.px.length <= Math.max(3, Math.round(ESPESSURA / 2))) {
    if (raiz(e.a) !== raiz(e.b)) unir(e.a, e.b);
    return false;
  }
  return true;
});
for (const e of arestas) {
  if (e.a >= 0) e.a = raiz(e.a);
  if (e.b >= 0) e.b = raiz(e.b);
}
// Centro de cada nó
const centros = new Map();
for (const [g, comp] of grupos.lista.entries()) {
  const r = raiz(g);
  const c = centros.get(r) ?? { sx: 0, sy: 0, n: 0 };
  for (const p of comp) {
    const [x, y] = xy(p);
    c.sx += x + 0.5;
    c.sy += y + 0.5;
    c.n++;
  }
  centros.set(r, c);
}
const centro = (g) => {
  const c = centros.get(g);
  return [c.sx / c.n, c.sy / c.n];
};

// Espinhos: pontinhas curtas saindo de um nó, sobra do afinamento
for (let volta = 0; volta < 2; volta++) {
  const grau = new Map();
  for (const e of arestas) for (const g of [e.a, e.b]) if (g >= 0) grau.set(g, (grau.get(g) ?? 0) + 1);
  arestas = arestas.filter((e) => {
    const solta = (e.a < 0) !== (e.b < 0);
    const no = e.a >= 0 ? e.a : e.b;
    return !(solta && e.px.length <= Math.max(4, Math.round(ESPESSURA)) && grau.get(no) >= 3);
  });
}

/* ----------------------------------------- 5. quais pontas continuam em qual (caneta) */
const pontos = (e) => e.px.map((p) => {
  const [x, y] = xy(p);
  return [x + 0.5, y + 0.5];
});
for (const e of arestas) {
  e.pts = pontos(e);
  const ws = e.px.map(larguraEm).sort((m, n) => m - n);
  e.largura = ws[ws.length >> 1];
  e.par = [null, null]; // para cada ponta: { aresta, lado, tipo: 'no' | 'elo' }
}
/** Direção que sai da ponta `lado` (0 = início, 1 = fim) para dentro da aresta. */
function direcaoParaDentro(e, lado, alcance = 7) {
  const pts = lado === 0 ? e.pts : [...e.pts].reverse();
  const base = lado === 0 ? (e.a >= 0 ? centro(e.a) : pts[0]) : e.b >= 0 ? centro(e.b) : pts[0];
  const alvo = pts[Math.min(alcance, pts.length - 1)];
  const dx = alvo[0] - base[0];
  const dy = alvo[1] - base[1];
  const n = Math.hypot(dx, dy);
  return n < 1e-6 ? null : [dx / n, dy / n];
}
const ligar = (e1, l1, e2, l2, tipo) => {
  e1.par[l1] = { aresta: e2, lado: l2, tipo };
  e2.par[l2] = { aresta: e1, lado: l1, tipo };
};

// Nos nós: cada ponta segue na que vem mais "reto" do outro lado
{
  const porNo = new Map();
  for (const e of arestas)
    for (const lado of [0, 1]) {
      const g = lado === 0 ? e.a : e.b;
      if (g < 0) continue;
      if (!porNo.has(g)) porNo.set(g, []);
      porNo.get(g).push({ e, lado, dir: direcaoParaDentro(e, lado) });
    }
  for (const pontas of porNo.values()) {
    const pares = [];
    for (let i = 0; i < pontas.length; i++)
      for (let j = i + 1; j < pontas.length; j++) {
        const [p, q] = [pontas[i], pontas[j]];
        if (p.e === q.e) continue;
        const cos = p.dir && q.dir ? p.dir[0] * q.dir[0] + p.dir[1] * q.dir[1] : 0;
        pares.push({ p, q, cos });
      }
    pares.sort((m, n) => m.cos - n.cos);
    for (const { p, q, cos } of pares) {
      if (p.e.par[p.lado] || q.e.par[q.lado]) continue;
      if (pontas.length > 2 && cos > -0.25) continue;
      ligar(p.e, p.lado, q.e, q.lado, 'no');
    }
  }
}

// Pontas soltas: liga as falhas do traço fino. Onde a caneta passou rápido, o risco saiu
// tracejado; os pedaços são emendados quando um aponta para o outro.
const MAX_FALHA = 42;
/** Largura do traço perto de uma ponta (mediana dos últimos pixels). */
function larguraNaPonta(e, lado) {
  const pts = (lado === 0 ? e.pts : [...e.pts].reverse()).slice(0, 8);
  const ws = pts.map(([x, y]) => larguraLocal(x, y)).sort((m, n) => m - n);
  return ws[ws.length >> 1];
}
/** Direção para fora da aresta na ponta `lado` (de dentro do traço para o vão). */
function direcaoParaFora(e, lado) {
  const pts = lado === 0 ? e.pts : [...e.pts].reverse();
  const dentro = direcaoParaDentro(e, lado, Math.min(6, pts.length - 1));
  return dentro ? [-dentro[0], -dentro[1]] : null;
}
{
  const soltas = [];
  for (const e of arestas)
    for (const lado of [0, 1]) {
      if (e.par[lado]) continue;
      if (e.px.length === 1 && lado === 1) continue;
      const no = lado === 0 ? e.a : e.b;
      const pts = lado === 0 ? e.pts : [...e.pts].reverse();
      soltas.push({ e, lado, p: no >= 0 ? centro(no) : pts[0], fora: direcaoParaFora(e, lado), w: larguraNaPonta(e, lado) });
    }
  const cand = [];
  for (let i = 0; i < soltas.length; i++)
    for (let j = i + 1; j < soltas.length; j++) {
      const [s, t] = [soltas[i], soltas[j]];
      if (s.e === t.e) continue;
      const dx = t.p[0] - s.p[0];
      const dy = t.p[1] - s.p[1];
      const d = Math.hypot(dx, dy);
      if (d > MAX_FALHA || d < 1e-6) continue;
      // Vão grande só onde o traço afina; entre dois trechos grossos, só falhas pequenas
      const fina = Math.min(s.w, t.w) <= 2;
      if (!fina && d > 6) continue;
      const v = [dx / d, dy / d];
      const c1 = s.fora ? s.fora[0] * v[0] + s.fora[1] * v[1] : 0.8;
      const c2 = t.fora ? -(t.fora[0] * v[0] + t.fora[1] * v[1]) : 0.8;
      // Quanto maior o vão, mais as duas pontas precisam apontar uma para a outra
      const exigido = !fina && d > 3 ? 0.85 : d <= 14 ? 0.72 : 0.72 + (d - 14) * 0.006;
      if (c1 < exigido || c2 < exigido) continue;
      cand.push({ s, t, custo: d * (1 + 4 * (1 - c1) + 4 * (1 - c2)) });
    }
  cand.sort((m, n) => m.custo - n.custo);
  for (const { s, t } of cand) {
    if (s.e.par[s.lado] || t.e.par[t.lado]) continue;
    ligar(s.e, s.lado, t.e, t.lado, 'elo');
  }
}

/* ---------------------------------------------------------- 6. traços contínuos */
const visitada = new Set();
const tracos = [];
/** Ponte sobre uma falha: curva que sai de uma ponta na direção dela e chega na outra do mesmo jeito. */
function ponte(p1, fora1, p2, fora2) {
  const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const k = d / 3;
  const c1 = fora1 ? [p1[0] + fora1[0] * k, p1[1] + fora1[1] * k] : p1;
  const c2 = fora2 ? [p2[0] + fora2[0] * k, p2[1] + fora2[1] * k] : p2;
  const n = Math.max(1, Math.round(d));
  const r = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const u = 1 - t;
    r.push([
      u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
      u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
    ]);
  }
  return r;
}
/** Segue um traço de aresta em aresta. Cada ponto leva a largura da tinta em volta dele
 * (NaN onde não há tinta para medir: centros de junção e pontes, preenchidos depois). */
function percorrer(inicio, ladoEntrada) {
  const pts = [];
  let e = inicio;
  let lado = ladoEntrada;
  const noDe = (a, l) => (l === 0 ? a.a : a.b);
  const comLargura = ([x, y]) => [x, y, larguraLocal(x, y)];
  if (noDe(e, lado) >= 0 && !e.par[lado]) pts.push([...centro(noDe(e, lado)), NaN]);
  while (e && !visitada.has(e)) {
    visitada.add(e);
    const seq = lado === 0 ? e.pts : [...e.pts].reverse();
    pts.push(...seq.map(comLargura));
    const sai = 1 - lado;
    const prox = e.par[sai];
    if (prox?.tipo === 'no') pts.push([...centro(noDe(e, sai)), NaN]);
    else if (!prox && noDe(e, sai) >= 0) pts.push([...centro(noDe(e, sai)), NaN]);
    if (prox?.tipo === 'elo' && !visitada.has(prox.aresta)) {
      const outra = prox.aresta;
      const inicioOutra = (prox.lado === 0 ? outra.pts : [...outra.pts].reverse())[0];
      for (const [x, y] of ponte(seq[seq.length - 1], direcaoParaFora(e, sai), inicioOutra, direcaoParaFora(outra, prox.lado)))
        pts.push([x, y, NaN]);
    }
    e = prox && !visitada.has(prox.aresta) ? prox.aresta : null;
    lado = prox ? prox.lado : 0;
  }
  // Pontes e junções herdam a largura dos vizinhos (a menor, já que as falhas são do traço fino)
  for (let i = 0; i < pts.length; i++) {
    if (!Number.isNaN(pts[i][2])) continue;
    let a = i - 1;
    while (a >= 0 && Number.isNaN(pts[a][2])) a--;
    let b = i + 1;
    while (b < pts.length && Number.isNaN(pts[b][2])) b++;
    const wa = a >= 0 ? pts[a][2] : Infinity;
    const wb = b < pts.length ? pts[b][2] : Infinity;
    pts[i][2] = Number.isFinite(Math.min(wa, wb)) ? Math.min(wa, wb) : 1;
  }
  return { pts };
}
// Começa pelas pontas sem continuação; o que sobrar são laços fechados
for (const e of arestas) for (const lado of [0, 1]) if (!visitada.has(e) && !e.par[lado]) tracos.push(percorrer(e, lado));
for (const e of arestas) if (!visitada.has(e)) tracos.push(percorrer(e, 0));

/* -------------------------------------------------------- 7. suavizar e simplificar */
/** Pontos a cada `passo` px; a largura (3º valor) é interpolada junto. */
function reamostrar(pts, passo = 1) {
  if (pts.length < 2) return pts;
  const r = [pts[0]];
  let sobra = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, aw] = pts[i - 1];
    const [bx, by, bw] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let t = passo - sobra;
    while (t <= seg) {
      const k = t / seg;
      r.push([ax + (bx - ax) * k, ay + (by - ay) * k, aw + (bw - aw) * k]);
      t += passo;
    }
    sobra = seg - (t - passo);
  }
  const ult = pts[pts.length - 1];
  if (Math.hypot(ult[0] - r[r.length - 1][0], ult[1] - r[r.length - 1][1]) > 0.3) r.push(ult);
  return r;
}
/** Suaviza a posição (gaussiana), sem mexer nas pontas. */
function suavizar(pts, sigma = 1.6) {
  const raio = Math.ceil(sigma * 2.5);
  const pesos = Array.from({ length: 2 * raio + 1 }, (_, k) => Math.exp(-((k - raio) ** 2) / (2 * sigma * sigma)));
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const alcance = Math.min(raio, i, pts.length - 1 - i);
    let sx = 0, sy = 0, sw = 0;
    for (let k = -alcance; k <= alcance; k++) {
      const w = pesos[k + raio];
      sx += pts[i + k][0] * w;
      sy += pts[i + k][1] * w;
      sw += w;
    }
    return [sx / sw, sy / sw, p[2]];
  });
}
/** Largura ao longo do traço: mediana (tira o calombo dos cruzamentos) e depois média móvel. */
function suavizarLarguras(ws, raioMediana = 6, raioMedia = 4) {
  const med = ws.map((_, i) => {
    const janela = ws.slice(Math.max(0, i - raioMediana), i + raioMediana + 1).sort((m, n) => m - n);
    return janela[janela.length >> 1];
  });
  return med.map((_, i) => {
    const janela = med.slice(Math.max(0, i - raioMedia), i + raioMedia + 1);
    return janela.reduce((s, w) => s + w, 0) / janela.length;
  });
}
/** Divide o traço em trechos finos, médios e grossos. Trechos curtos demais viram parte do vizinho. */
const CLASSE_MINIMA = 12;
const classeDe = (w) => (w < 1.5 ? 0 : w < 2.15 ? 1 : 2);
function trechosPorLargura(ws) {
  let trechos = [];
  for (let i = 0; i < ws.length; i++) {
    const c = classeDe(ws[i]);
    const ult = trechos[trechos.length - 1];
    if (ult && ult.c === c) ult.fim = i;
    else trechos.push({ ini: i, fim: i, c });
  }
  for (;;) {
    const curtos = trechos.filter((t) => t.fim - t.ini + 1 < CLASSE_MINIMA);
    if (!curtos.length || trechos.length === 1) break;
    const t = curtos.reduce((m, x) => (x.fim - x.ini < m.fim - m.ini ? x : m));
    const i = trechos.indexOf(t);
    const [ant, prox] = [trechos[i - 1], trechos[i + 1]];
    // Junta com o vizinho de largura mais parecida (ou o único que houver)
    const alvo = !ant ? prox : !prox ? ant : Math.abs(ant.c - t.c) <= Math.abs(prox.c - t.c) ? ant : prox;
    alvo.ini = Math.min(alvo.ini, t.ini);
    alvo.fim = Math.max(alvo.fim, t.fim);
    trechos.splice(i, 1);
    // Vizinhos da mesma classe que ficaram lado a lado viram um trecho só
    trechos = trechos.reduce((acc, x) => {
      const u = acc[acc.length - 1];
      if (u && u.c === x.c) u.fim = x.fim;
      else acc.push(x);
      return acc;
    }, []);
  }
  return trechos;
}
function simplificar(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1e-9;
  let maior = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = len < 1e-6 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
    if (d > maior) (maior = d), (idx = i);
  }
  if (maior <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplificar(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplificar(pts.slice(idx), eps)];
}
const f = (n) => (Math.round(n * 10) / 10).toString();
/** Catmull-Rom → Bézier cúbica. */
function caminhoSvg(pts) {
  if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}h0.1`;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const comprimento = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

const arred = (n) => Math.round(n * 10) / 10;

/* Pontas que param a poucos pixels de outro traço, apontando para ele (o "T" com fresta),
 * são esticadas até encostar. */
const ALCANCE_ENCOSTO = 14;
const caminhos = tracos.filter((t) => t.pts.length).map((t) => suavizar(reamostrar(t.pts)));
{
  const grade = new Map();
  const chave = (x, y) => `${Math.floor(x / 4)},${Math.floor(y / 4)}`;
  caminhos.forEach((pts, dono) =>
    pts.forEach(([x, y], i) => {
      const k = chave(x, y);
      if (!grade.has(k)) grade.set(k, []);
      grade.get(k).push({ x, y, dono, i });
    }),
  );
  /** Pontos a acrescentar numa ponta para ela encostar no traço mais próximo para onde aponta
   * (dentro de um cone de ~35°), ou nenhum. */
  const esticar = (pts, dono, inicio) => {
    const i0 = inicio ? 0 : pts.length - 1;
    const ik = inicio ? Math.min(6, pts.length - 1) : Math.max(0, pts.length - 7);
    const [px, py, pw] = pts[i0];
    const dx = px - pts[ik][0];
    const dy = py - pts[ik][1];
    const n = Math.hypot(dx, dy);
    if (n < 1e-6) return [];
    const dir = [dx / n, dy / n];
    const [gx, gy] = [Math.floor(px / 4), Math.floor(py / 4)];
    const alcanceGrade = Math.ceil(ALCANCE_ENCOSTO / 4);
    let melhor = null;
    for (let a = gx - alcanceGrade; a <= gx + alcanceGrade; a++)
      for (let b = gy - alcanceGrade; b <= gy + alcanceGrade; b++)
        for (const q of grade.get(`${a},${b}`) ?? []) {
          // O próprio fim do traço não conta
          if (q.dono === dono && Math.abs(q.i - i0) < 30) continue;
          const vx = q.x - px;
          const vy = q.y - py;
          const d = Math.hypot(vx, vy);
          if (d < 1.5 || d > ALCANCE_ENCOSTO) continue;
          const cos = (vx * dir[0] + vy * dir[1]) / d;
          if (cos < 0.82) continue;
          const custo = d * (1 + 3 * (1 - cos));
          if (!melhor || custo < melhor.custo) melhor = { x: q.x, y: q.y, d, custo };
        }
    if (!melhor) return [];
    const extra = [];
    for (let t = 1; t < melhor.d; t += 1) extra.push([px + ((melhor.x - px) * t) / melhor.d, py + ((melhor.y - py) * t) / melhor.d, pw]);
    extra.push([melhor.x, melhor.y, pw]);
    return extra;
  };
  // Mede as duas pontas de todos os traços antes de mexer em qualquer um
  const extras = caminhos.map((pts, dono) =>
    comprimento(pts) < 20 ? [[], []] : [esticar(pts, dono, true), esticar(pts, dono, false)],
  );
  caminhos.forEach((pts, dono) => {
    const [antes, depois] = extras[dono];
    pts.unshift(...[...antes].reverse());
    pts.push(...depois);
  });
}

/** Cada traço da caneta vira um ou mais trechos de largura própria, emendados ponta com ponta. */
const gestos = caminhos
  .map((lisosOriginal) => {
    // A caneta anda da esquerda para a direita
    const lisos = lisosOriginal[lisosOriginal.length - 1][0] < lisosOriginal[0][0] ? [...lisosOriginal].reverse() : lisosOriginal;
    const pts = lisos;
    const ws = suavizarLarguras(lisos.map((p) => p[2]));
    const trechos = trechosPorLargura(ws).map(({ ini, fim }) => {
      // Cada trecho começa no último ponto do anterior, para não abrir fresta entre eles
      const parte = lisos.slice(Math.max(0, ini - 1), fim + 1);
      const larg = ws.slice(ini, fim + 1).sort((m, n) => m - n);
      const simples = simplificar(parte, 0.3);
      // O traço mais fino ainda precisa aparecer quando a assinatura encolhe na tela
      const largura = Math.max(0.8, larg[larg.length >> 1] * 0.95);
      return { d: caminhoSvg(simples), largura: arred(largura), comprimento: Math.round(comprimento(simples)) };
    });
    const xs = pts.map((p) => p[0]);
    const total = trechos.reduce((s, x) => s + x.comprimento, 0);
    // Pingo: um ponto só, que a ponta redonda desenha como bolinha do tamanho do traço
    if (!total) for (const t of trechos) t.largura = arred(Math.max(t.largura, ESPESSURA * 1.1));
    // Um pingo tem comprimento zero: a largura dele é a do próprio trecho
    const largMedia = total
      ? trechos.reduce((s, x) => s + x.largura * x.comprimento, 0) / total
      : Math.max(...trechos.map((x) => x.largura));
    return { trechos, total, largMedia, x0: pts[0][0], y0: pts[0][1], xMin: Math.min(...xs), xMax: Math.max(...xs) };
  })
  // Pontinhos de sujeira que sobraram
  .filter((g) => g.total >= 4 || g.largMedia >= 2.3);

/* -------------------------------------------------------------- 8. ordem da escrita */
// Da esquerda para a direita; os pingos vêm depois das letras e o traço que corta a assinatura
// inteira (o sublinhado) fecha a assinatura
const papel = (g) => (g.xMax - g.xMin > W * 0.5 ? 2 : g.total < 15 && g.largMedia >= 1.5 && g.xMin > W * 0.5 ? 1 : 0);
gestos.sort((m, n) => papel(m) - papel(n) || m.x0 - n.x0);

const saida = gestos.flatMap((g) => g.trechos.map((t, i) => ({ ...t, continua: i > 0 })));
console.log(`${gestos.length} traços da caneta, ${saida.length} trechos (${W}×${H})`);
for (const [i, g] of gestos.entries())
  console.log(
    `${String(i).padStart(2)}  x ${f(g.xMin).padStart(6)}–${f(g.xMax).padEnd(6)}  início (${f(g.x0)}, ${f(g.y0)})  ` +
      `comprimento ${String(g.total).padStart(4)}  larguras ${g.trechos.map((t) => t.largura).join(' ')}`,
  );

/* ----------------------------------------------------- 9. contorno da tinta
 * O que aparece na tela é o contorno exato da tinta do PNG (preenchido). Os traços acima não são
 * desenhados: viram a máscara que revela esse contorno na ordem da caneta. Assim o resultado é
 * igual ao original mesmo onde o esqueleto erra (traços grossos que se cruzam quase paralelos). */
function contornoDaTinta() {
  const ISO = 0.5;
  const v = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * info.channels + info.channels - 1] / 255);
  const posicao = new Map();
  const vizinhos = new Map();
  // Ponto onde a borda de uma célula cruza o nível 0,5 (h = borda horizontal, v = vertical)
  const ponto = (tipo, x, y) => {
    const k = `${tipo}${x},${y}`;
    if (!posicao.has(k)) {
      const a = v(x, y);
      const b = tipo === 'h' ? v(x + 1, y) : v(x, y + 1);
      const t = Math.abs(b - a) < 1e-9 ? 0.5 : (ISO - a) / (b - a);
      posicao.set(k, tipo === 'h' ? [x + t + 0.5, y + 0.5] : [x + 0.5, y + t + 0.5]);
    }
    return k;
  };
  const ligar = (a, b) => {
    for (const [p, q] of [[a, b], [b, a]]) {
      if (!vizinhos.has(p)) vizinhos.set(p, []);
      vizinhos.get(p).push(q);
    }
  };
  for (let y = -1; y < H; y++)
    for (let x = -1; x < W; x++) {
      const tl = v(x, y), tr = v(x + 1, y), br = v(x + 1, y + 1), bl = v(x, y + 1);
      const c = (tl > ISO ? 8 : 0) | (tr > ISO ? 4 : 0) | (br > ISO ? 2 : 0) | (bl > ISO ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = () => ponto('h', x, y), B = () => ponto('h', x, y + 1);
      const L = () => ponto('v', x, y), R = () => ponto('v', x + 1, y);
      const centro = (tl + tr + br + bl) / 4 > ISO;
      switch (c) {
        case 1: case 14: ligar(L(), B()); break;
        case 2: case 13: ligar(B(), R()); break;
        case 3: case 12: ligar(L(), R()); break;
        case 4: case 11: ligar(T(), R()); break;
        case 6: case 9: ligar(T(), B()); break;
        case 7: case 8: ligar(L(), T()); break;
        case 5: if (centro) { ligar(L(), T()); ligar(B(), R()); } else { ligar(T(), R()); ligar(L(), B()); } break;
        case 10: if (centro) { ligar(T(), R()); ligar(L(), B()); } else { ligar(L(), T()); ligar(B(), R()); } break;
      }
    }
  // Segue cada laço fechado
  const visto = new Set();
  const lacos = [];
  for (const inicio of vizinhos.keys()) {
    if (visto.has(inicio)) continue;
    const laco = [];
    let atual = inicio, antes = null;
    while (atual && !visto.has(atual)) {
      visto.add(atual);
      laco.push(posicao.get(atual));
      const prox = vizinhos.get(atual).find((k) => k !== antes && !visto.has(k));
      antes = atual;
      atual = prox;
    }
    if (laco.length >= 8) lacos.push(laco);
  }
  // Suaviza de leve (laço fechado), simplifica e escreve
  return lacos
    .map((laco) => {
      const n = laco.length;
      const liso = laco.map((_, i) => {
        let sx = 0, sy = 0, sw = 0;
        for (let k = -2; k <= 2; k++) {
          const w = Math.exp(-(k * k) / 2);
          const [px, py] = laco[(i + k + n) % n];
          sx += px * w; sy += py * w; sw += w;
        }
        return [sx / sw, sy / sw];
      });
      const simples = simplificar([...liso, liso[0]], 0.3).slice(0, -1);
      return `M${simples.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    })
    .join('');
}
const contorno = contornoDaTinta();
console.log(`contorno: ${contorno.length} caracteres`);

const ts = `// Gerado por tools/assinatura/vetorizar.mjs a partir de tools/assinatura/assinatura.png. Não edite à mão.
// "contorno" é a tinta (preenchida). "tracos" são o caminho da caneta, na ordem em que a assinatura
// é escrita; servem de máscara que revela o contorno. "continua" diz que o trecho segue o anterior
// sem levantar a caneta (só muda a largura do traço).

export const ASSINATURA = {
  largura: ${W},
  altura: ${H},
  contorno: '${contorno}',
  tracos: [
${saida.map((t) => `    { d: '${t.d}', largura: ${t.largura}, comprimento: ${t.comprimento}, continua: ${t.continua} },`).join('\n')}
  ],
} as const;
`;
await writeFile(SAIDA, ts);
console.log('→', SAIDA);

if (DEPURAR) {
  const cor = (i) => `hsl(${Math.round((i * 360) / gestos.length)} 85% 42%)`;
  const caminhos = gestos.flatMap((g, i) =>
    g.trechos.map((t) => `<path d="${t.d}" fill="none" stroke="${cor(i)}" stroke-width="${t.largura}" stroke-linecap="round" stroke-linejoin="round"/>`),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  <image href="data:image/png;base64,${(await sharp(ENTRADA).png().toBuffer()).toString('base64')}" width="${W}" height="${H}" opacity="0.18"/>
  ${caminhos.join('\n  ')}
  ${gestos.map((g, i) => `<text x="${f(g.x0)}" y="${f(g.y0 - 3)}" font-size="9" font-family="Arial" fill="${cor(i)}">${i}</text>`).join('\n  ')}
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(DEPURACAO);
  console.log('→', DEPURACAO);
}
