/* Recorta o busto do retrato da abertura, para os riscos de luz do fundo aparecerem atrás dele.
 *
 * O recorte vem de tools/retrato/busto.webp: o mesmo retrato (mesmo tamanho e enquadramento de
 * src/assets/hero/retrato.webp) com o fundo tirado num editor de imagem. Vale fundo transparente
 * ou fundo branco: com transparência, o busto é o que não é transparente; sem, o fundo é o branco
 * que encosta na borda da foto (o branco dentro do busto, se houver, continua sendo busto).
 * Para ajustar o recorte, edite busto.webp e rode este script de novo.
 *
 * Gera em public/hero/:
 *   busto-mascara.webp  máscara do busto (canal alfa), na proporção da foto
 *   busto-sombra.webp   a mesma silhueta, alargada e desfocada: o halo escuro que separa o
 *                       busto da luz do fundo
 *   busto-contorno.webp o contorno do busto, uma linha branca fina no tamanho da foto: é o que o
 *                       flare da abertura ilumina (ver src/efeitos/flare)
 *
 * Uso: node tools/retrato/mascara.mjs [--depurar]   (com --depurar, grava depuracao.png aqui) */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FOTO = fileURLToPath(new URL('../../src/assets/hero/retrato.webp', import.meta.url));
const RECORTE = fileURLToPath(new URL('./busto.webp', import.meta.url));
const PASTA = fileURLToPath(new URL('../../public/hero/', import.meta.url));
const DEPURACAO = fileURLToPath(new URL('./depuracao.png', import.meta.url));
/** Largura das máscaras geradas (a altura segue a proporção da foto). */
const W = 1000;
/** Com fundo branco: o quanto um pixel precisa ser claro (o menor dos três canais) para ser fundo. */
const BRANCO = 230;

const foto = await sharp(FOTO).metadata();
const recorte = await sharp(RECORTE).metadata();
if (recorte.width !== foto.width || recorte.height !== foto.height)
  throw new Error(
    `busto.webp precisa ter o tamanho do retrato (${foto.width}×${foto.height}), e está com ${recorte.width}×${recorte.height}.`,
  );

/* 1. O busto em tamanho cheio: 255 no busto, 0 no fundo */
const { data: px, info } = await sharp(RECORTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const [GW, GH] = [info.width, info.height];
const busto = new Uint8Array(GW * GH).fill(255);
let transparente = 0;
for (let p = 0; p < GW * GH; p++) if (px[p * 4 + 3] < 128) transparente++;
if (transparente > 0) {
  for (let p = 0; p < GW * GH; p++) busto[p] = px[p * 4 + 3];
} else {
  // Fundo branco: tudo o que é branco e se liga à borda da foto por outros brancos
  const branco = (p) => Math.min(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]) >= BRANCO;
  const pilha = [];
  const marcar = (p) => {
    if (busto[p] && branco(p)) {
      busto[p] = 0;
      pilha.push(p);
    }
  };
  for (let x = 0; x < GW; x++) marcar(x), marcar((GH - 1) * GW + x);
  for (let y = 0; y < GH; y++) marcar(y * GW), marcar(y * GW + GW - 1);
  while (pilha.length) {
    const p = pilha.pop();
    const x = p % GW;
    if (x > 0) marcar(p - 1);
    if (x < GW - 1) marcar(p + 1);
    if (p >= GW) marcar(p - GW);
    if (p < (GH - 1) * GW) marcar(p + GW);
  }
}

/* 2. Na largura das máscaras: a redução já suaviza a borda, e um desfoque leve termina */
const borda = await sharp(Buffer.from(busto), { raw: { width: GW, height: GH, channels: 1 } })
  .resize(W)
  .blur(0.8)
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });
const H = borda.info.height;
const N = W * H;

/** Dilatação separável (horizontal e depois vertical, vizinhança quadrada) de uma máscara 0/1. */
function dilatar(src, r) {
  const h = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r && !v; k++) {
        const nx = x + k;
        if (nx >= 0 && nx < W && src[y * W + nx]) v = 1;
      }
      h[y * W + x] = v;
    }
  const out = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r && !v; k++) {
        const ny = y + k;
        if (ny >= 0 && ny < H && h[ny * W + x]) v = 1;
      }
      out[y * W + x] = v;
    }
  return out;
}

/* 3. Saídas: alfa suave para a máscara, e o halo (alargado e bem desfocado) */
await mkdir(PASTA, { recursive: true });
const comoAlfa = (valores) => {
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = valores[i];
  }
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
};
await comoAlfa(borda.data).webp({ quality: 90, alphaQuality: 90 }).toFile(PASTA + 'busto-mascara.webp');
const m = Uint8Array.from(borda.data, (v) => (v >= 128 ? 1 : 0));
const halo = await sharp(Buffer.from(dilatar(m, 22).map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } })
  .blur(18)
  .toColourspace('b-w')
  .raw()
  .toBuffer();
await comoAlfa(halo).webp({ quality: 80, alphaQuality: 80 }).toFile(PASTA + 'busto-sombra.webp');

/* 4. O contorno, no tamanho cheio da foto: uma faixa de ~3 px onde o busto desfocado cruza a metade
   (a borda da foto não conta: o desfoque estende a imagem, então ali não nasce linha) */
const desfocado = await sharp(Buffer.from(busto), { raw: { width: GW, height: GH, channels: 1 } })
  .blur(1.4)
  .toColourspace('b-w')
  .raw()
  .toBuffer();
const linha = Buffer.alloc(GW * GH * 4);
for (let p = 0; p < GW * GH; p++) {
  const v = Math.max(0, Math.min(1, 1 - Math.abs(desfocado[p] / 255 - 0.5) * 3.2));
  linha[p * 4] = linha[p * 4 + 1] = linha[p * 4 + 2] = 255;
  linha[p * 4 + 3] = Math.round(v * 255);
}
await sharp(linha, { raw: { width: GW, height: GH, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 95 })
  .toFile(PASTA + 'busto-contorno.webp');
console.log(`máscaras do busto (${W}×${H}) → ${PASTA}`);

if (process.argv.includes('--depurar')) {
  // Foto recortada sobre um degradê colorido, com o halo escuro, para julgar o contorno
  const cinza = await sharp(FOTO).resize(W, H).greyscale().raw().toBuffer();
  const cor = Buffer.alloc(N * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const fundoR = 40 + 160 * (x / W);
      const fundoB = 200 - 120 * (y / H);
      const sombra = halo[i] / 255;
      const alfa = borda.data[i] / 255;
      const pixel = cinza[i];
      cor[i * 3] = Math.round(fundoR * (1 - sombra * 0.85) * (1 - alfa) + pixel * alfa);
      cor[i * 3 + 1] = Math.round(30 * (1 - sombra * 0.85) * (1 - alfa) + pixel * alfa);
      cor[i * 3 + 2] = Math.round(fundoB * (1 - sombra * 0.85) * (1 - alfa) + pixel * alfa);
    }
  await sharp(cor, { raw: { width: W, height: H, channels: 3 } }).png().toFile(DEPURACAO);
  console.log('→', DEPURACAO);
}
