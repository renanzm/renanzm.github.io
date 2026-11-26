/* Música de fundo: public/audio/musica-de-fundo.aac (ver o README), em loop, baixinho.
 *
 * A música tenta tocar assim que a página abre. O navegador só deixa quando a pessoa já
 * interagiu com o site (ou com ele em visitas anteriores); se ele bloquear, a música entra no
 * primeiro clique, toque ou tecla na página. O botão "Som" do cabeçalho liga e desliga, e a
 * escolha fica salva (desligou, continua desligada nas próximas visitas). Ao trocar de página, a
 * música volta do ponto em que estava. */

const ARQUIVO = '/audio/musica-de-fundo.aac';
/** Volume da música: fundo, não primeiro plano. */
const VOLUME = 0.35;
const ENTRADA = 2;
const SAIDA = 0.8;
const CHAVE_PREFERENCIA = 'musica';
const CHAVE_TEMPO = 'musica-tempo';
/** Os gestos que o navegador aceita como permissão para tocar som (no toque, é ao soltar). */
const GESTOS = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;

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

  /** Leva o volume até `alvo` em `segundos`; chegando a zero, pausa. Com timers, e não quadros:
   * numa aba em segundo plano os quadros param, e a música não pararia de tocar. */
  const levar = (alvo: number, segundos: number) => {
    const a = audio;
    if (!a) return;
    clearTimeout(fade);
    const de = a.volume;
    const inicio = performance.now();
    const passo = () => {
      const t = Math.min(1, (performance.now() - inicio) / 1000 / segundos);
      a.volume = de + (alvo - de) * t;
      if (t < 1) fade = window.setTimeout(passo, 30);
      else if (alvo === 0) a.pause();
    };
    passo();
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
    for (const tipo of GESTOS) addEventListener(tipo, primeiraInteracao, true);
  };
  const soltarEspera = () => {
    esperando = false;
    for (const tipo of GESTOS) removeEventListener(tipo, primeiraInteracao, true);
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
  // Tenta já ao abrir; se o navegador bloquear, tocar() espera o primeiro gesto
  if (ligada()) void tocar();
}
