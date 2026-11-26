/* Gera a malha de "raio-x" do busto: pontos ligados em triângulos, como um escudo de força, no
 * formato exato do busto recortado. Na abertura, ela aparece no lugar do rosto onde o cursor passa
 * (ver src/landing/raio-x.ts).
 *
 * Os pontos são mais densos onde a foto tem detalhe (olhos, nariz, boca, barba, contorno) e mais
 * espaçados nas áreas lisas; o contorno do recorte também ganha pontos, para a malha seguir a
 * silhueta. Os pontos são ligados por triangulação de Delaunay, e cada triângulo ganha um
 * sombreado leve com a luz da foto, para o rosto continuar reconhecível na malha. O sorteio usa
 * uma semente fixa: a mesma foto gera sempre a mesma malha.
 *
 * Lê src/assets/hero/retrato.webp e public/hero/busto-mascara.webp (rode antes o mascara.mjs).
 * Gera public/hero/busto-malha.webp, no tamanho e enquadramento da foto, com fundo transparente.
 *
 * Uso: node tools/retrato/malha.mjs [--depurar]   (com --depurar, grava depuracao-malha.png aqui,
 * a malha sobre preto) */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FOTO = fileURLToPath(new URL('../../src/assets/hero/retrato.webp', import.meta.url));
const MASCARA = fileURLToPath(new URL('../../public/hero/busto-mascara.webp', import.meta.url));
const SAIDA = fileURLToPath(new URL('../../public/hero/busto-malha.webp', import.meta.url));
const DEPURACAO = fileURLToPath(new URL('./depuracao-malha.png', import.meta.url));

/** Espaço entre pontos (px da máscara, 1000 de largura): no detalhe e nas áreas lisas. */
const RAIO_MIN = 7;
const RAIO_MAX = 26;
/** Espaço entre os pontos do contorno. */
const RAIO_CONTORNO = 11;
/** Cor da malha: entre o verde de destaque do site e um ciano de escudo de força. */
const COR = [110, 232, 210];
const COR_NO = [225, 255, 246];
const SEMENTE = 20260226;

/* ------------------------------------------------------------ entrada */
const mascaraMeta = await sharp(MASCARA).metadata();
const [W, H] = [mascaraMeta.width, mascaraMeta.height];
const N = W * H;
const alfa = await sharp(MASCARA).ensureAlpha().extractChannel(3).raw().toBuffer();
const cinza = await sharp(FOTO).resize(W, H, { fit: 'fill' }).greyscale().blur(1.2).raw().toBuffer();
const foto = await sharp(FOTO).metadata();
const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H && alfa[(y | 0) * W + (x | 0)] >= 128;

/* ------------------------------------------- detalhe da foto (Sobel), de 0 a 1 */
const detalhe = new Float32Array(N);
const valores = [];
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (alfa[i] < 128) continue;
    const g = (dx, dy) => cinza[(y + dy) * W + (x + dx)];
    const gx = g(1, -1) + 2 * g(1, 0) + g(1, 1) - g(-1, -1) - 2 * g(-1, 0) - g(-1, 1);
    const gy = g(-1, 1) + 2 * g(0, 1) + g(1, 1) - g(-1, -1) - 2 * g(0, -1) - g(1, -1);
    detalhe[i] = Math.hypot(gx, gy);
    valores.push(detalhe[i]);
  }
valores.sort((a, b) => a - b);
const teto = valores[Math.floor(valores.length * 0.95)] || 1;
for (let i = 0; i < N; i++) detalhe[i] = Math.min(1, detalhe[i] / teto);

/* ------------------------------------------------------------ pontos */
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sorteio = aleatorio(SEMENTE);

// Candidatos: o contorno primeiro, depois o resto, do mais detalhado ao mais liso (com ruído)
const contorno = [];
const resto = [];
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (!dentro(x, y)) continue;
    const borda =
      x === 0 || y === 0 || x === W - 1 || y === H - 1 || !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
    if (borda) contorno.push([x, y, RAIO_CONTORNO, 2 + sorteio()]);
    else {
      const g = detalhe[y * W + x];
      resto.push([x, y, RAIO_MAX - (RAIO_MAX - RAIO_MIN) * Math.pow(g, 0.6), g + sorteio() * 0.35]);
    }
  }
const candidatos = contorno.concat(resto).sort((a, b) => b[3] - a[3]);

// Disco de Poisson com raio variável, numa grade para achar vizinhos rápido
const CELULA = RAIO_MIN;
const [GW, GH] = [Math.ceil(W / CELULA), Math.ceil(H / CELULA)];
const grade = Array.from({ length: GW * GH }, () => []);
const pontos = [];
const alcance = Math.ceil(RAIO_MAX / CELULA);
for (const [x, y, r] of candidatos) {
  const cx = Math.floor(x / CELULA);
  const cy = Math.floor(y / CELULA);
  let livre = true;
  for (let j = Math.max(0, cy - alcance); j <= Math.min(GH - 1, cy + alcance) && livre; j++)
    for (let i = Math.max(0, cx - alcance); i <= Math.min(GW - 1, cx + alcance) && livre; i++)
      for (const p of grade[j * GW + i]) {
        const minimo = Math.min(r, p[2]);
        if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < minimo * minimo) {
          livre = false;
          break;
        }
      }
  if (!livre) continue;
  const p = [x + 0.5, y + 0.5, r];
  pontos.push(p);
  grade[cy * GW + cx].push(p);
}

/* ------------------------------------------- triangulação de Delaunay (Bowyer-Watson) */
function circuncirculo(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const a2 = a[0] ** 2 + a[1] ** 2;
  const b2 = b[0] ** 2 + b[1] ** 2;
  const c2 = c[0] ** 2 + c[1] ** 2;
  const ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2];
}
const vertices = pontos.map((p) => [p[0], p[1]]);
const grande = Math.max(W, H) * 10;
const s0 = vertices.push([-grande, -grande]) - 1;
const s1 = vertices.push([W / 2, grande]) - 1;
const s2 = vertices.push([W + grande, -grande]) - 1;
const novo = (a, b, c) => ({ v: [a, b, c], cc: circuncirculo(vertices[a], vertices[b], vertices[c]) });
let triangulos = [novo(s0, s1, s2)];
for (let i = 0; i < pontos.length; i++) {
  const [px, py] = vertices[i];
  const ruins = [];
  const bons = [];
  for (const t of triangulos) ((px - t.cc[0]) ** 2 + (py - t.cc[1]) ** 2 < t.cc[2] ? ruins : bons).push(t);
  // A borda do buraco: arestas dos triângulos ruins que não são divididas entre dois deles
  const contagem = new Map();
  for (const t of ruins)
    for (let k = 0; k < 3; k++) {
      const a = t.v[k];
      const b = t.v[(k + 1) % 3];
      const chave = a < b ? `${a},${b}` : `${b},${a}`;
      const e = contagem.get(chave);
      if (e) e.n++;
      else contagem.set(chave, { a, b, n: 1 });
    }
  for (const { a, b, n } of contagem.values()) if (n === 1) bons.push(novo(a, b, i));
  triangulos = bons;
}
// Fora: os que tocam o triângulo inicial, os que caem fora do busto e os esticados demais
triangulos = triangulos.filter(({ v }) => {
  if (v.some((k) => k >= pontos.length)) return false;
  const [a, b, c] = v.map((k) => vertices[k]);
  const centro = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
  if (!dentro(centro[0], centro[1])) return false;
  for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) > RAIO_MAX * 2.6) return false;
    if (!dentro((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) return false;
  }
  return true;
});

/* ------------------------------------------------------------ desenho */
const [sx, sy] = [foto.width / W, foto.height / H];
const P = (k) => `${(vertices[k][0] * sx).toFixed(1)},${(vertices[k][1] * sy).toFixed(1)}`;
const luz = (x, y) => cinza[Math.min(H - 1, Math.max(0, y | 0)) * W + Math.min(W - 1, Math.max(0, x | 0))] / 255;
const det = (x, y) => detalhe[Math.min(H - 1, Math.max(0, y | 0)) * W + Math.min(W - 1, Math.max(0, x | 0))];

// Triângulos: sombreados pela luz da foto (o rosto continua reconhecível), bem transparentes
let preenchimentos = '';
for (const { v } of triangulos) {
  const [a, b, c] = v.map((k) => vertices[k]);
  const l = (luz((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3) * 2 + luz(a[0], a[1]) + luz(b[0], b[1]) + luz(c[0], c[1])) / 5;
  const opacidade = (0.04 + 0.42 * Math.pow(l, 1.1)).toFixed(3);
  preenchimentos += `<path d="M${P(v[0])}L${P(v[1])}L${P(v[2])}Z" fill-opacity="${opacidade}"/>`;
}

// Arestas: mais acesas onde a foto tem detalhe, em cinco níveis (um caminho por nível)
const arestas = new Map();
for (const { v } of triangulos)
  for (let k = 0; k < 3; k++) {
    const a = v[k];
    const b = v[(k + 1) % 3];
    arestas.set(a < b ? `${a},${b}` : `${b},${a}`, [a, b]);
  }
const niveis = Array.from({ length: 5 }, () => '');
for (const [a, b] of arestas.values()) {
  const [p, q] = [vertices[a], vertices[b]];
  const meio = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const g = (det(p[0], p[1]) + det(q[0], q[1]) + det(meio[0], meio[1]) * 2) / 4;
  const l = (luz(p[0], p[1]) + luz(q[0], q[1])) / 2;
  const nivel = Math.min(4, Math.floor((0.55 * g + 0.45 * l) * 5));
  niveis[nivel] += `M${P(a)}L${P(b)}`;
}
const usados = new Set();
for (const { v } of triangulos) for (const k of v) usados.add(k);

const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const svg = (espessura, comNos, comPreenchimento) => `<svg xmlns="http://www.w3.org/2000/svg" width="${foto.width}" height="${foto.height}">
  ${comPreenchimento ? `<g fill="${rgb(COR)}">${preenchimentos}</g>` : ''}
  <g fill="none" stroke="${rgb(COR)}" stroke-width="${espessura}" stroke-linecap="round">
    ${niveis.map((d, i) => (d ? `<path d="${d}" stroke-opacity="${(0.28 + i * 0.16).toFixed(2)}"/>` : '')).join('')}
  </g>
  ${comNos ? `<g fill="${rgb(COR_NO)}">${[...usados].map((k) => `<circle cx="${(vertices[k][0] * sx).toFixed(1)}" cy="${(vertices[k][1] * sy).toFixed(1)}" r="${(1.3 + 1.6 * det(vertices[k][0], vertices[k][1])).toFixed(2)}"/>`).join('')}</g>` : ''}
</svg>`;

// Um brilho desfocado por baixo e a malha nítida por cima
const brilho = await sharp(Buffer.from(svg(3.2, true, false))).blur(5).png().toBuffer();
const nitida = await sharp(Buffer.from(svg(1.15, true, true))).png().toBuffer();
const malha = await sharp({ create: { width: foto.width, height: foto.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: brilho, blend: 'over' },
    { input: nitida, blend: 'over' },
  ])
  .png()
  .toBuffer();
await sharp(malha).webp({ quality: 82, alphaQuality: 85 }).toFile(SAIDA);
console.log(`malha: ${pontos.length} pontos, ${triangulos.length} triângulos, ${arestas.size} arestas → ${SAIDA}`);

if (process.argv.includes('--depurar')) {
  await sharp(malha).flatten({ background: '#000' }).png().toFile(DEPURACAO);
  console.log('→', DEPURACAO);
}
