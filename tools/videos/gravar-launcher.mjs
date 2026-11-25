// App Launcher: extrai o código de uma tag (padrão: a release mais recente) para uma pasta
// temporária, cria uma configuração isolada (outro app_id, sem autoatualização, pasta Apps própria)
// e roda o roteiro em launcher_roteiro.py. Seu clone do app-launcher não é alterado.
// Uso: node tools/videos/gravar-launcher.mjs [tag]
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AQUI, FFMPEG, SAIDA, TEMP, repo, duracaoDe, finalizar, poster } from './config.mjs';

const REPO = repo('app-launcher');
const APP_ID = 'AppLauncherGravacaoDemo';
const COPIA = join(TEMP, 'launcher-copia');
const BRUTO = join(TEMP, 'launcher-bruto.mp4');
const estado = join(process.env.LOCALAPPDATA || '', APP_ID);

execFileSync('git', ['-C', REPO, 'fetch', '--tags', '-q', 'origin']);
const tag = process.argv[2] || execFileSync('git', ['-C', REPO, 'tag', '--sort=-creatordate']).toString().split(/\r?\n/)[0].trim();
console.log('  versão', tag);

rmSync(COPIA, { recursive: true, force: true });
rmSync(estado, { recursive: true, force: true });
mkdirSync(COPIA, { recursive: true });
execSync(`git -C "${REPO}" archive ${tag} launcher assets launcher_config.example.json | tar -x -C "${COPIA.replace(/\\/g, '/')}"`);
const cfg = JSON.parse(readFileSync(join(COPIA, 'launcher_config.example.json'), 'utf8'));
cfg.app_id = APP_ID;
cfg.install_root = 'Apps';
delete cfg.self_update;
writeFileSync(join(COPIA, 'launcher_config.json'), JSON.stringify(cfg, null, 2));

try {
  const python = process.env.LAUNCHER_PYTHON || join(REPO, '.venv', 'Scripts', 'python.exe');
  execFileSync(python, [join(AQUI, 'launcher_roteiro.py')], {
    cwd: COPIA,
    stdio: 'inherit',
    timeout: 150000,
    env: { ...process.env, LAUNCHER_COPIA: COPIA, LAUNCHER_BRUTO: BRUTO, FFMPEG },
  });
  const video = join(SAIDA, 'app-launcher.mp4');
  finalizar(BRUTO, video, { duracao: duracaoDe(BRUTO) });
  poster(video, join(SAIDA, 'app-launcher.webp'), 0.8);
  console.log(`app-launcher (${tag}): ${duracaoDe(video).toFixed(1)} s`);
} finally {
  rmSync(estado, { recursive: true, force: true }); // estado temporário do launcher
}
