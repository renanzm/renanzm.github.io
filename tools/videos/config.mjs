// Caminhos e utilitários comuns dos scripts de gravação.
// Tudo pode ser trocado por variáveis de ambiente (ver tools/videos/README.md).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const SITE = resolve(AQUI, '..', '..');
/** Pasta com os repositórios dos apps (padrão: a mesma pasta onde está o my-site). */
export const REPOS = process.env.REPOS_DIR || resolve(SITE, '..');
export const repo = (nome) => join(REPOS, nome);
/** Onde os vídeos e pôsteres finais são gravados. */
export const SAIDA = process.env.VIDEOS_SAIDA || join(SITE, 'public', 'videos');
/** Arquivos temporários (cópias isoladas, quadros, dados de demonstração). */
export const TEMP = process.env.VIDEOS_TEMP || join(tmpdir(), 'my-site-videos');
mkdirSync(SAIDA, { recursive: true });
mkdirSync(TEMP, { recursive: true });

function acharFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const noPath = execFileSync('where', ['ffmpeg'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim();
    if (noPath) return noPath;
  } catch {}
  const conhecido = join(process.env.LOCALAPPDATA || '', 'hermes/tools/ffmpeg-9.0.1-win32-x64/bin/ffmpeg.exe');
  if (existsSync(conhecido)) return conhecido;
  throw new Error('ffmpeg não encontrado: instale-o ou defina a variável FFMPEG');
}
export const FFMPEG = acharFfmpeg();
export const GODOT = process.env.GODOT || 'C:/Godot/Godot_v4.7.2-stable_win64.exe';
export const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));
/** Roda o ffmpeg em silêncio (só mostra erros). */
export const ff = (args) => execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
/** HWND da janela principal de um processo do Windows. */
export const hwndDe = (pid) =>
  execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).MainWindowHandle`]).toString().trim();

/** Extrai um quadro do vídeo como pôster (WebP). */
export function poster(video, saida, segundo = 0.6) {
  ff(['-ss', String(segundo), '-i', video, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '86', saida]);
}

/** Acrescenta entrada e saída suaves a um vídeo bruto e grava a versão final (H.264, sem áudio). */
export function finalizar(bruto, saida, { duracao, crf = 23, fade = 0.35 }) {
  ff(['-i', bruto, '-vf', `fade=t=in:st=0:d=${fade},fade=t=out:st=${(duracao - fade).toFixed(2)}:d=${fade},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-movflags', '+faststart', '-an', saida]);
}

/** Duração de um vídeo, em segundos. */
export function duracaoDe(video) {
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', video], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr));
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return 0;
}
