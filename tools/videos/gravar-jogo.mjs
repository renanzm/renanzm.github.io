// Idle Gas Station: grava cenas do jogo com o Movie Maker do Godot (tempo simulado, sem perder
// quadros), usando a ferramenta de cenários do próprio projeto, que usa save e configurações
// isolados (não mexe no seu progresso). Depois junta três trechos com transições suaves.
// O vídeo só mostra o jogo rodando: nenhum arquivo de código vai para o site.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { GODOT, SAIDA, TEMP, repo, ff, poster } from './config.mjs';

const JOGO = join(repo('gas-station'), 'game');
const PASTA = join(TEMP, 'jogo');
mkdirSync(PASTA, { recursive: true });

// [cenário, início do trecho (s), duração do trecho (s)]
const CENAS = [
  ['p2_late', 15.5, 5],
  ['p2_rain_night', 17, 4.5],
  ['night', 5, 4.5],
];
for (const [cena] of CENAS) {
  execFileSync(GODOT, ['--path', JOGO, '--write-movie', join(PASTA, `${cena}.avi`), '--fixed-fps', '30',
    '--script', 'res://tools/scenario_capture.gd', '--', cena, PASTA, '--save-path=user://scenario_save.json'], { stdio: 'ignore', timeout: 180000 });
  console.log('  cena', cena);
}

const T = 0.6;
const entradas = CENAS.flatMap(([cena, ini, dur]) => ['-ss', String(ini), '-t', String(dur), '-i', join(PASTA, `${cena}.avi`)]);
const filtros = CENAS.map((_, i) => `[${i}:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[s${i}]`);
let anterior = 's0', offset = 0;
for (let i = 1; i < CENAS.length; i++) {
  offset += CENAS[i - 1][2] - T;
  const nome = i === CENAS.length - 1 ? 'fim' : `x${i}`;
  filtros.push(`[${anterior}][s${i}]xfade=transition=fade:duration=${T}:offset=${offset.toFixed(2)}[${nome}]`);
  anterior = nome;
}
const total = offset + CENAS.at(-1)[2];
filtros.push(`[fim]fade=t=in:st=0:d=0.35,fade=t=out:st=${(total - 0.35).toFixed(2)}:d=0.35,format=yuv420p[v]`);
const video = join(SAIDA, 'idle-gas-station.mp4');
// A chuva pesa na compressão: CRF 27 com tune animation mantém a imagem nítida em ~2 MB
ff([...entradas, '-filter_complex', filtros.join(';'), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slower', '-crf', '27', '-tune', 'animation', '-movflags', '+faststart', '-an', video]);
poster(video, join(SAIDA, 'idle-gas-station.webp'), 1.5);
console.log(`idle-gas-station: ${total.toFixed(1)} s`);
