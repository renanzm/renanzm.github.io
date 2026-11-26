/* Música de fundo: a Lacrimosa do Réquiem de Mozart (Josef Krips, Filarmônica de Viena, 1950;
 * ver o README sobre a gravação), em loop, baixinho.
 *
 * O navegador não deixa um site começar a tocar som sozinho, então a música entra no primeiro
 * clique ou tecla na página. O botão "Som" do cabeçalho liga e desliga, e a escolha fica salva
 * (desligou, continua desligada nas próximas visitas). Ao trocar de página, a música volta do
 * ponto em que estava. O áudio só é baixado quando vai tocar. */

const ARQUIVO = '/audio/lacrimosa.aac';
/** Volume da música: fundo, não primeiro plano. */
const VOLUME = 0.35;
const ENTRADA = 2;
const SAIDA = 0.8;
const CHAVE_PREFERENCIA = 'musica';
const CHAVE_TEMPO = 'musica-tempo';

export function iniciarMusica() {
  const botao = document.querySelector<HTMLButtonElement>('[data-som]');
  if (!botao) return;

  let audio: HTMLAudioElement | undefined;
  let fade = 0;
  let esperando = false;
  const ligada = () => localStorage.getItem(CHAVE_PREFERENCIA) !== '0';

  const mostrar = () => {
    const tocando = !!audio && !audio.paused;
    botao.setAttribute('aria-pressed', String(ligada()));
    botao.classList.toggle('tocando', tocando);
  };

  const criar = () => {
    if (audio) return audio;
    audio = new Audio(ARQUIVO);
    audio.loop = true;
    audio.volume = 0;
    const tempo = Number(sessionStorage.getItem(CHAVE_TEMPO));
    if (tempo > 0) audio.currentTime = tempo;
    audio.addEventListener('play', mostrar);
    audio.addEventListener('pause', mostrar);
    return audio;
  };

  /** Leva o volume até `alvo` em `segundos`; chegando a zero, pausa. */
  const levar = (alvo: number, segundos: number) => {
    const a = audio;
    if (!a) return;
    cancelAnimationFrame(fade);
    const de = a.volume;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 1000 / segundos);
      a.volume = de + (alvo - de) * t;
      if (t < 1) fade = requestAnimationFrame(passo);
      else if (alvo === 0) a.pause();
    };
    fade = requestAnimationFrame(passo);
  };

  const tocar = async () => {
    const a = criar();
    try {
      await a.play();
      esperando = false;
      levar(VOLUME, ENTRADA);
    } catch {
      // Sem um clique ou tecla na página ainda: toca no primeiro
      esperar();
    }
  };

  const primeiraInteracao = (event: Event) => {
    // O próprio botão decide sozinho (ver alternar)
    if ((event.target as Element | null)?.closest?.('[data-som]')) return;
    soltarEspera();
    if (ligada()) void tocar();
  };
  const esperar = () => {
    if (esperando) return;
    esperando = true;
    addEventListener('pointerdown', primeiraInteracao, true);
    addEventListener('keydown', primeiraInteracao, true);
  };
  const soltarEspera = () => {
    esperando = false;
    removeEventListener('pointerdown', primeiraInteracao, true);
    removeEventListener('keydown', primeiraInteracao, true);
  };

  botao.addEventListener('click', () => {
    if (ligada()) {
      localStorage.setItem(CHAVE_PREFERENCIA, '0');
      soltarEspera();
      levar(0, SAIDA);
    } else {
      localStorage.setItem(CHAVE_PREFERENCIA, '1');
      void tocar();
    }
    mostrar();
  });

  // Trocando de página, guarda o ponto da música para a próxima continuar dali
  addEventListener('pagehide', () => {
    if (audio && !audio.paused) sessionStorage.setItem(CHAVE_TEMPO, String(audio.currentTime));
  });

  mostrar();
  if (!ligada()) return;
  // Com o tempo guardado, a pessoa já estava ouvindo: tenta seguir tocando (o navegador pode
  // permitir, por ela já ter interagido com o site); sem ele, espera o primeiro clique
  if (sessionStorage.getItem(CHAVE_TEMPO)) void tocar();
  else esperar();
}
