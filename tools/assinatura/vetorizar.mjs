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
  if (e.a >= 0 && e.b >= 0 && e.px.length <= 3) {
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
    return !(solta && e.px.length <= 4 && grau.get(no) >= 3);
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

// Pontas soltas: liga falhas do traço fino (a caneta passou rápido e o risco falhou)
{
  const soltas = [];
  for (const e of arestas)
    for (const lado of [0, 1]) {
      if (e.par[lado]) continue;
      if (e.px.length === 1 && lado === 1) continue;
      const no = lado === 0 ? e.a : e.b;
      const pts = lado === 0 ? e.pts : [...e.pts].reverse();
      const dentro = direcaoParaDentro(e, lado, Math.min(5, pts.length - 1));
      soltas.push({ e, lado, p: no >= 0 ? centro(no) : pts[0], fora: dentro ? [-dentro[0], -dentro[1]] : null });
    }
  const cand = [];
  for (let i = 0; i < soltas.length; i++)
    for (let j = i + 1; j < soltas.length; j++) {
      const [s, t] = [soltas[i], soltas[j]];
      if (s.e === t.e) continue;
      const dx = t.p[0] - s.p[0];
      const dy = t.p[1] - s.p[1];
      const d = Math.hypot(dx, dy);
      if (d > 14 || d < 1e-6) continue;
      const fina = Math.min(s.e.largura, t.e.largura) <= 1.8;
      if (!fina && d > 3) continue;
      const v = [dx / d, dy / d];
      const c1 = s.fora ? s.fora[0] * v[0] + s.fora[1] * v[1] : 0.8;
      const c2 = t.fora ? -(t.fora[0] * v[0] + t.fora[1] * v[1]) : 0.8;
      if (c1 < 0.72 || c2 < 0.72) continue;
      cand.push({ s, t, custo: d * (1 + 4 * (1 - c1) + 4 * (1 - c2)) });
    }
  cand.sort((m, n) => m.custo - n.custo);
  for (const { s, t } of cand) {
    if (s.e.par[s.lado] || t.e.par[t.lado]) continue;
    // Não fecha um ciclo de arestas que já estão no mesmo traço
    ligar(s.e, s.lado, t.e, t.lado, 'elo');
  }
}

/* ---------------------------------------------------------- 6. traços contínuos */
const visitada = new Set();
const tracos = [];
function percorrer(inicio, ladoEntrada) {
  const pts = [];
  const larguras = [];
  let e = inicio;
  let lado = ladoEntrada;
  const noDe = (a, l) => (l === 0 ? a.a : a.b);
  if (noDe(e, lado) >= 0 && !e.par[lado]) pts.push(centro(noDe(e, lado)));
  while (e && !visitada.has(e)) {
    visitada.add(e);
    const seq = lado === 0 ? e.pts : [...e.pts].reverse();
    pts.push(...seq);
    for (let k = 0; k < e.pts.length; k++) larguras.push(e.largura);
    const sai = 1 - lado;
    const prox = e.par[sai];
    if (prox?.tipo === 'no') pts.push(centro(noDe(e, sai)));
    else if (!prox && noDe(e, sai) >= 0) pts.push(centro(noDe(e, sai)));
    e = prox && !visitada.has(prox.aresta) ? prox.aresta : null;
    lado = prox ? prox.lado : 0;
  }
  return { pts, larguras };
}
// Começa pelas pontas sem continuação; o que sobrar são laços fechados
for (const e of arestas) for (const lado of [0, 1]) if (!visitada.has(e) && !e.par[lado]) tracos.push(percorrer(e, lado));
for (const e of arestas) if (!visitada.has(e)) tracos.push(percorrer(e, 0));

/* -------------------------------------------------------- 7. suavizar e simplificar */
function reamostrar(pts, passo = 1) {
  if (pts.length < 2) return pts;
  const r = [pts[0]];
  let sobra = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let t = passo - sobra;
    while (t <= seg) {
      r.push([ax + ((bx - ax) * t) / seg, ay + ((by - ay) * t) / seg]);
      t += passo;
    }
    sobra = seg - (t - passo);
  }
  const ult = pts[pts.length - 1];
  if (Math.hypot(ult[0] - r[r.length - 1][0], ult[1] - r[r.length - 1][1]) > 0.3) r.push(ult);
  return r;
}
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
    return [sx / sw, sy / sw];
  });
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

let saida = tracos
  .filter((t) => t.pts.length)
  .map((t) => {
    let pts = t.pts;
    // A caneta anda da esquerda para a direita
    if (pts[pts.length - 1][0] < pts[0][0]) pts = [...pts].reverse();
    const lisos = simplificar(suavizar(reamostrar(pts)), 0.3);
    const ws = [...t.larguras].sort((m, n) => m - n);
    const largura = ws[ws.length >> 1] ?? 1;
    const xs = pts.map((p) => p[0]);
    return {
      d: caminhoSvg(lisos),
      largura: Math.round(largura * 0.95 * 10) / 10,
      comprimento: Math.round(comprimento(lisos)),
      x0: pts[0][0],
      y0: pts[0][1],
      xMin: Math.min(...xs),
      xMax: Math.max(...xs),
    };
  })
  // Pontinhos de sujeira que sobraram
  .filter((t) => t.comprimento >= 4 || t.largura >= 2.5);

/* -------------------------------------------------------------- 8. ordem da escrita */
// Da esquerda para a direita; os pingos vêm depois das letras e o traço que corta a assinatura
// inteira (o sublinhado) fecha a assinatura
const papel = (t) => (t.xMax - t.xMin > W * 0.5 ? 2 : t.comprimento < 15 && t.largura >= 1.5 && t.xMin > W * 0.5 ? 1 : 0);
saida.sort((m, n) => papel(m) - papel(n) || m.x0 - n.x0);

console.log(`${saida.length} traços (${W}×${H})`);
for (const [i, t] of saida.entries())
  console.log(
    `${String(i).padStart(2)}  x ${f(t.xMin).padStart(6)}–${f(t.xMax).padEnd(6)}  início (${f(t.x0)}, ${f(t.y0)})  ` +
      `comprimento ${String(t.comprimento).padStart(4)}  largura ${t.largura}`,
  );

const ts = `// Gerado por tools/assinatura/vetorizar.mjs a partir de tools/assinatura/assinatura.png. Não edite à mão.
// Cada traço é um trecho contínuo da caneta, na ordem em que a assinatura é desenhada.

export const ASSINATURA = {
  largura: ${W},
  altura: ${H},
  tracos: [
${saida.map((t) => `    { d: '${t.d}', largura: ${t.largura}, comprimento: ${t.comprimento} },`).join('\n')}
  ],
} as const;
`;
await writeFile(SAIDA, ts);
console.log('→', SAIDA);

if (DEPURAR) {
  const cor = (i) => `hsl(${Math.round((i * 360) / saida.length)} 85% 45%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#fff"/>
  <image href="data:image/png;base64,${(await sharp(ENTRADA).png().toBuffer()).toString('base64')}" width="${W}" height="${H}" opacity="0.18"/>
  ${saida.map((t, i) => `<path d="${t.d}" fill="none" stroke="${cor(i)}" stroke-width="${t.largura}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n  ')}
  ${saida.map((t, i) => `<text x="${f(t.x0)}" y="${f(t.y0 - 3)}" font-size="9" font-family="Arial" fill="${cor(i)}">${i}</text>`).join('\n  ')}
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(DEPURACAO);
  console.log('→', DEPURACAO);
}
