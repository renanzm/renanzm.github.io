// Print estático do Sound Mod antigo (Python), para a página dele no site.
// Roda o código-fonte numa cópia isolada (config.json, sons e clipe de demonstração ao lado),
// com todos os dispositivos de áudio em "nenhum". A build .exe da pasta dist não monta a
// interface inteira nesta captura, por isso o print sai do código-fonte da mesma versão.
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { SITE, TEMP, repo, espera, ff } from './config.mjs';

const REPO = repo('sound-mod');
const PASTA = join(TEMP, 'soundmod-python');
rmSync(PASTA, { recursive: true, force: true });
mkdirSync(join(PASTA, 'sounds'), { recursive: true });
mkdirSync(join(PASTA, 'clips'), { recursive: true });
cpSync(join(REPO, 'main.py'), join(PASTA, 'main.py'));
cpSync(join(REPO, 'soundmod'), join(PASTA, 'soundmod'), { recursive: true, filter: (f) => !f.includes('__pycache__') });

const SONS = [
  ['airhorn', 'sine=f=620:d=2.4', 'f1'],
  ['bruh', 'sine=f=180:d=1.1', 'f2'],
  ['vine-boom', 'sine=f=70:d=1.6', 'f3'],
  ['sad-trombone', 'sine=f=233:d=3.2', 'f4'],
  ['rimshot', 'anoisesrc=d=0.9:c=pink', 'f7'],
];
for (const [nome, fonte] of SONS) ff(['-f', 'lavfi', '-i', fonte, '-ac', '1', '-ar', '44100', join(PASTA, 'sounds', `${nome}.wav`)]);
ff(['-f', 'lavfi', '-i', 'anoisesrc=d=5:c=pink:a=0.9', '-af', "volume='0.08+0.92*pow(abs(sin(2*PI*1.3*t)*sin(2*PI*0.37*t+0.6)),1.4)':eval=frame", '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', join(PASTA, 'clips', 'last_clip.mp3')]);
writeFileSync(join(PASTA, 'config.json'), JSON.stringify({
  language: 'pt',
  mic_device: '', output_device: '', monitor_device: '', loopback_device: '',
  mix_mic: true, monitor: true, master_volume: 0.85, clip_seconds: 5,
  voice_effect: 'robot', hear_self: false, clip_trim: [0.8, 3.9],
  save_clip_key: 'f5', play_clip_key: 'f6', stop_key: 'f12',
  slots: SONS.map(([nome, , key], i) => ({ key, path: `sounds/${nome}.wav`, volume: [1, 0.8, 0.9, 0.7, 1][i] })),
}, null, 2));

const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-Command', cmd]).toString().trim();
const janela = () => ps(`(Get-Process | Where-Object { $_.MainWindowTitle -eq 'Sound Mod' } | Select-Object -First 1 | ForEach-Object { "$($_.Id) $($_.MainWindowHandle)" })`);
if (janela()) throw new Error('feche o Sound Mod antes de rodar (a captura procura a janela pelo título)');

// O pythonw do ambiente virtual abre o Python de verdade em outro processo: a janela é achada pelo título
spawn(join(REPO, '.venv', 'Scripts', 'pythonw.exe'), ['main.py'], { cwd: PASTA, stdio: 'ignore', detached: true }).unref();
let info = '';
for (let t = 0; t < 60 && !info; t++) { await espera(400); info = janela(); }
const [pid, hwnd] = info.split(' ');
const png = join(TEMP, 'sound-mod-python.png');
try {
  await espera(9000);
  ff(['-f', 'lavfi', '-i', `gfxcapture=hwnd=${hwnd}:capture_cursor=0:max_framerate=10,hwdownload,format=bgra`, '-frames:v', '1', png]);
} finally {
  ps(`Stop-Process -Id ${pid} -Force`);
}
const destino = join(SITE, 'src', 'assets', 'projetos', 'sound-mod-python.webp');
const info2 = await sharp(png).webp({ quality: 88 }).toFile(destino);
console.log(`sound-mod-python: ${info2.width}x${info2.height} em ${destino}`);
