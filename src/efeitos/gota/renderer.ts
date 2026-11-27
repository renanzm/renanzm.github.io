/* Gota d'água de vidro flutuando, ao lado da declaração do "Sobre". Adaptado de renderer.ts do
 * exemplo "Glass Sculpture" do vgpu (conceito e design visual de Kazuyuki Chinda, @ckazu).
 *
 * Igual ao exemplo: a superfície com dpr de 1 a 2 e auto-resize, a cena compilada antes do primeiro
 * quadro, o clock e o frameLoop do vgpu, a luz que segue o cursor, a órbita arrastando, o giro da
 * escultura, e o dispose que desfaz tudo na ordem inversa mantendo a primeira falha.
 *
 * Diferente:
 *   - controles fixos, sem o painel (lil-gui) do exemplo: a forma "droplets" (gotas que se juntam e
 *     se separam), vidro claro com dispersão, a luz "studio" (o vidro refrata um ambiente claro e
 *     parece água) e sem o fundo e o piso do estúdio, para a gota flutuar na página (ver
 *     sculpture.wgsl e present.wgsl), com a câmera mais perto (DISTANCIA);
 *   - a superfície é premultiplied: o canvas é transparente onde não há vidro;
 *   - o contexto de GPU é dividido com o resto da página (efeitos/contexto.ts): no lugar de
 *     gpu.dispose(), o dispose libera a cena e a superfície e solta a reserva;
 *   - o loop para quando a gota sai da tela e volta quando ela entra (o exemplo desenha sempre);
 *     o passo de tempo é limitado, para a gota não dar um salto depois da pausa. */
import { clock, frameLoop, surface, type FrameLoopHandle } from 'vgpu';
import { reservarGpu } from '../contexto';
import { installPointerInput } from './pointer-input';
import { DEFAULT_CONTROLS, createScene, normalizeControls, type SculptureControls } from './scene';

/** Distância da câmera: mais perto que a do exemplo (3,6), para a gota encher o espaço. */
const DISTANCIA = 2.7;

const CONTROLES: SculptureControls = {
  ...DEFAULT_CONTROLS,
  shape: 'droplets',
  glass: 'clear',
  light: 'studio',
  dispersion: true,
  spin: true,
  renderScale: 0.75,
  backdrop: false,
};

export function criarGota(canvas: HTMLCanvasElement) {
  let disposed = false;
  const reserva = reservarGpu();
  const browserCleanups: Array<() => void> = [];
  const controls = normalizeControls(CONTROLES);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    let firstError: unknown;
    for (const cleanup of [...browserCleanups].reverse()) {
      try {
        cleanup();
      } catch (error) {
        firstError ??= error;
      }
    }
    browserCleanups.length = 0;
    try {
      reserva.soltar();
    } catch (error) {
      firstError ??= error;
    }
    if (firstError !== undefined) throw firstError;
  };

  const fail = (error: unknown): never => {
    try {
      dispose();
    } catch {
      // Teardown must not replace the frame failure.
    }
    throw error;
  };

  const ready = (async () => {
    const context = await reserva.gpu;
    if (disposed) return;
    const output = surface(context, canvas, { dpr: [1, 2], alphaMode: 'premultiplied' });
    browserCleanups.push(() => output.dispose());
    const scene = createScene(context, output, controls);
    browserCleanups.push(() => scene.destroy());
    await scene.prepare(output);
    if (disposed) return;

    const input = installPointerInput(canvas, DISTANCIA);
    browserCleanups.push(() => input.dispose());
    const resizeScene = () => {
      try {
        scene.resize(output.size, controls.renderScale);
      } catch (error) {
        fail(error);
      }
    };
    const unsubscribeResize = output.onResize(resizeScene);
    browserCleanups.push(unsubscribeResize);

    const time = clock(context);
    let sculptureTime = 0;
    let loop: FrameLoopHandle | undefined;
    const ligar = () => {
      if (loop || disposed) return;
      loop = frameLoop(context, (currentFrame) => {
        try {
          // Depois de uma pausa, o primeiro passo seria enorme: no máximo 0,1 s
          const deltaTime = Math.min(0.1, Math.max(0, time.deltaTime));
          input.advance(deltaTime);
          if (controls.spin) sculptureTime += deltaTime;
          scene.render(currentFrame, output, input.camera, controls, {
            sculptureTime,
            clockTime: time.time,
            deltaTime,
            light: input.light,
          });
        } catch (error) {
          fail(error);
        }
      });
    };
    const desligar = () => {
      loop?.stop();
      loop = undefined;
    };
    browserCleanups.push(desligar);

    // Só desenha com a gota na tela
    const visivel = new IntersectionObserver(([entrada]) => (entrada?.isIntersecting ? ligar() : desligar()));
    visivel.observe(canvas);
    browserCleanups.push(() => visivel.disconnect());
  })().catch((error: unknown) => {
    if (disposed) return;
    fail(error);
  });

  return { ready, dispose };
}
