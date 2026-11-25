// Sound Mod (Rust): abre o app da release uma vez por tema, com uma pasta de dados isolada
// (SOUNDMOD_DATA_DIR), grava a janela com o gfxcapture (pelo HWND da instância aberta) e junta
// tudo com transições. Dispositivos = "" (nenhum): o app não abre microfone, saída nem a captura
// do áudio do PC. As suas configurações em %APPDATA%\SoundMod não são tocadas.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAIDA, TEMP, repo, espera, ff, hwndDe, poster } from './config.mjs';

const EXE = process.env.SOUNDMOD_EXE || join(repo('sound-mod-rs'), 'dist', 'SoundMod', 'SoundMod.exe');
const DADOS = join(TEMP, 'soundmod-dados');
const SEG = join(TEMP, 'soundmod-temas');
rmSync(DADOS, { recursive: true, force: true });
rmSync(SEG, { recursive: true, force: true });
mkdirSync(join(DADOS, 'sounds'), { recursive: true });
mkdirSync(join(DADOS, 'clips'), { recursive: true });
mkdirSync(SEG, { recursive: true });

// Sons sintéticos (na tela só aparecem os nomes e as durações)
const SONS = [
  ['airhorn', 'sine=f=620:d=2.4', 'f1', null],
  ['bruh', 'sine=f=180:d=1.1', 'f2', null],
  ['vine-boom', 'sine=f=70:d=1.6', 'ctrl+1', 'Memes'],
  ['sad-trombone', 'sine=f=233:d=3.2', 'f4', 'Memes'],
  ['rimshot', 'anoisesrc=d=0.9:c=pink', 'f3', 'Memes'],
  ['aplausos', 'anoisesrc=d=4.2:c=white:a=0.5', 'f7', 'Jogo'],
  ['contagem', 'sine=f=880:d=3.0', 'f8', 'Jogo'],
];
for (const [nome, fonte] of SONS) ff(['-f', 'lavfi', '-i', fonte, '-ac', '1', '-ar', '44100', join(DADOS, 'sounds', `${nome}.wav`)]);
// Clipe do áudio do PC: ruído com envelope de fala, para a forma de onda ter cara de voz
ff(['-f', 'lavfi', '-i', 'anoisesrc=d=5:c=pink:a=0.9', '-af', "volume='0.08+0.92*pow(abs(sin(2*PI*1.3*t)*sin(2*PI*0.37*t+0.6)),1.4)':eval=frame", '-ac', '1', '-ar', '44100', join(DADOS, 'clips', 'last_clip.wav')]);

const base = {
  language: 'pt',
  mic_device: '', output_device: '', monitor_device: '', loopback_device: '',
  mix_mic: true, monitor: true, master_volume: 0.85, clip_seconds: 5,
  hear_self: false, clip_pitch: 0, save_clip_key: 'f5', play_clip_key: 'f6', stop_key: 'f12',
  collections: [{ name: 'Memes', collapsed: false }, { name: 'Jogo', collapsed: false }],
  slots: SONS.map(([nome, , key, col], i) => ({ key, path: join(DADOS, 'sounds', `${nome}.wav`), volume: [1, 0.8, 0.9, 0.7, 1, 0.6, 0.85][i], collection: col })),
};

// Um tema por abertura, variando efeito de voz, lista compacta e trecho do clipe
const TEMAS = [
  { accent: 'green', voice_effect: 'normal', compact_list: false, clip_trim: [0.6, 3.9] },
  { accent: 'cyan', voice_effect: 'robot', compact_list: false, clip_trim: [0.6, 3.9] },
  { accent: 'blue', voice_effect: 'deep', compact_list: false, clip_trim: [1.0, 4.4] },
  { accent: 'purple', voice_effect: 'robot', compact_list: true, clip_trim: [1.0, 4.4] },
  { accent: 'pink', voice_effect: 'autotune', compact_list: true, clip_trim: [0.4, 3.2] },
  { accent: 'red', voice_effect: 'echo', compact_list: false, clip_trim: [0.4, 3.2] },
  { accent: 'orange', voice_effect: 'radio', compact_list: false, clip_trim: [1.4, 4.6] },
  { accent: 'yellow', voice_effect: 'alien', compact_list: true, clip_trim: [1.4, 4.6] },
  { accent: 'vice_city', voice_effect: 'normal', compact_list: false, clip_trim: [0.8, 4.0] },
];

const segmentos = [];
for (const [i, tema] of TEMAS.entries()) {
  writeFileSync(join(DADOS, 'config.json'), JSON.stringify({ ...base, ...tema }, null, 2));
  const app = spawn(EXE, [], { env: { ...process.env, SOUNDMOD_DATA_DIR: DADOS }, stdio: 'ignore' });
  try {
    let hwnd = '0';
    for (let t = 0; t < 40 && (hwnd === '0' || !hwnd); t++) { await espera(250); hwnd = hwndDe(app.pid); }
    await espera(1600); // primeira pintura e animações de entrada
    const saida = join(SEG, `${String(i).padStart(2, '0')}-${tema.accent}.mp4`);
    ff(['-f', 'lavfi', '-i', `gfxcapture=hwnd=${hwnd}:capture_cursor=0:max_framerate=30,hwdownload,format=bgra`, '-t', '1.9', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', saida]);
    segmentos.push(saida);
    console.log('  tema', tema.accent);
  } finally {
    app.kill();
    await espera(600);
  }
}

// Junta com varreduras suaves, todos na mesma escala
const T = 0.45, DUR = 1.9;
const entradas = segmentos.flatMap((s) => ['-i', s]);
const filtros = segmentos.map((_, i) => `[${i}:v]scale=1280:-2:flags=lanczos,setsar=1,fps=30,format=yuv420p[s${i}]`);
let anterior = 's0', offset = 0;
for (let i = 1; i < segmentos.length; i++) {
  offset += DUR - T;
  const nome = i === segmentos.length - 1 ? 'fim' : `x${i}`;
  filtros.push(`[${anterior}][s${i}]xfade=transition=smoothleft:duration=${T}:offset=${offset.toFixed(2)}[${nome}]`);
  anterior = nome;
}
const total = offset + DUR;
filtros.push(`[fim]fade=t=in:st=0:d=0.35,fade=t=out:st=${(total - 0.35).toFixed(2)}:d=0.35,format=yuv420p[v]`);
const video = join(SAIDA, 'sound-mod-rs.mp4');
ff([...entradas, '-filter_complex', filtros.join(';'), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', '-an', video]);
poster(video, join(SAIDA, 'sound-mod-rs.webp'), 0.8);
console.log(`sound-mod-rs: ${segmentos.length} temas, ${total.toFixed(1)} s`);
