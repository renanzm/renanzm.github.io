/* Flare na silhueta: adaptado de renderer.ts do exemplo "Next.js Flare" do vgpu. A luz passeia
 * sozinha em volta do rosto, acendendo o contorno do busto mais perto dela e espalhando raios
 * volumétricos; quando o cursor entra na abertura, a luz passa a segui-lo.
 *
 * Igual ao exemplo: a fila de resize com gerações (um tamanho novo cancela o anterior), o loop a
 * ~30 quadros por segundo, a luz que segue o alvo suavemente, a respiração que trava acesa
 * enquanto o cursor está em cima, o toque não mexe na luz, e o guard/fail que desfaz tudo e
 * mantém a falha original.
 *
 * Diferente, porque aqui o efeito fica em cima do busto da abertura:
 *   - o contorno vem de uma imagem pronta (busto-contorno.webp, gerada por
 *     tools/retrato/mascara.mjs), carregada uma vez, em vez do SVG do logo rasterizado a cada
 *     tamanho;
 *   - a superfície é premultiplied (o canvas fica transparente onde não há luz, ver
 *     composite.wgsl), e não opaca;
 *   - o cursor é ouvido na abertura inteira: o canvas não recebe eventos, para não atrapalhar os
 *     riscos de luz nem os links;
 *   - o contexto de GPU é dividido com o resto da página (efeitos/contexto.ts): no lugar de
 *     gpu.dispose(), o dispose libera a cadeia, a superfície e a imagem e solta a reserva;
 *   - fora da tela ou com a aba oculta, nada é desenhado. */
import type { Surface } from 'vgpu';
import { reservarGpu } from '../contexto';
import {
  backingDimensions,
  FlarePipeline,
  followLight,
  imageRaster,
  mapAutonomousLight,
  runCleanups,
  type FlarePlacement,
  type LogoRaster,
  type Point,
} from './pipeline';

type RenderSize = Readonly<{ width: number; height: number; dpr: number }>;

const FRAME_INTERVAL_MS = 33;
const PULSE_HOLD_SECONDS = 0.35;

interface Opcoes {
  /** Canvas por cima do busto, do tamanho da caixa da foto. */
  readonly canvas: HTMLCanvasElement;
  /** Onde o cursor é ouvido: a abertura. */
  readonly area: HTMLElement;
  /** URL do contorno do busto. */
  readonly contorno: string;
}

export function criarFlare({ canvas, area, contorno }: Opcoes) {
  let disposed = false;
  let failed = false;
  const reserva = reservarGpu();
  let output: Surface | undefined;
  let pipeline: FlarePipeline | undefined;
  let imagem: ImageBitmap | undefined;
  let raster: LogoRaster | undefined;
  let placement: FlarePlacement | undefined;
  let light: Point = [0.5, 0.4];
  let pointer: Point | undefined;
  let pulseHold = 0;
  let frameIndex = 0;
  let staticDirty = true;
  let lastTime = 0;
  let lastRender = -Infinity;
  let animationFrame = 0;
  let observer: ResizeObserver | undefined;
  let visibilidade: IntersectionObserver | undefined;
  let naTela = true;
  let pendingSize: RenderSize | undefined;
  let resizeTask: Promise<void> | undefined;
  let resizeGeneration = 0;
  let appliedBacking: Point = [0, 0];
  let appliedSupersample = 0;

  const applySize = async (size: RenderSize, generation: number) => {
    if (!pipeline || !raster) return;
    const backing = backingDimensions(size.width, size.height, size.dpr);
    const supersample = size.dpr < 1.5 ? 2 : 1;
    if (backing[0] === appliedBacking[0] && backing[1] === appliedBacking[1] && supersample === appliedSupersample) {
      return;
    }
    const nextPlacement = await pipeline.replace(
      backing,
      supersample,
      raster,
      () => disposed || generation !== resizeGeneration,
    );
    if (!nextPlacement) return;
    placement = nextPlacement;
    appliedBacking = backing;
    appliedSupersample = supersample;
    staticDirty = true;
  };

  const drainResizes = async () => {
    while (pendingSize && !disposed) {
      const size = pendingSize;
      pendingSize = undefined;
      await applySize(size, resizeGeneration);
    }
  };

  const resize = (size: RenderSize): Promise<void> => {
    if (disposed || size.width <= 0 || size.height <= 0) return Promise.resolve();
    pendingSize = size;
    resizeGeneration += 1;
    resizeTask ??= drainResizes()
      .catch((error: unknown) => {
        if (disposed && !failed) return;
        fail(error);
      })
      .finally(() => {
        resizeTask = undefined;
      });
    return resizeTask;
  };

  // offsetWidth/Height: o tamanho de layout, sem a escala da abertura e da rolagem
  const measure = () =>
    guard(() => {
      void resize({ width: canvas.offsetWidth, height: canvas.offsetHeight, dpr: window.devicePixelRatio || 1 });
    });

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    guard(() => {
      const rect = canvas.getBoundingClientRect();
      pointer = [
        Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width))),
        Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
      ];
    });
  };

  const handlePointerLeave = () => {
    pointer = undefined;
  };

  const frameLoop = (now: number) => {
    if (disposed) return;
    guard(() => {
      animationFrame = requestAnimationFrame(frameLoop);
      const activePipeline = pipeline;
      if (now - lastRender < FRAME_INTERVAL_MS || !placement || !activePipeline) return;
      if (!naTela || document.hidden) return;
      lastRender = now;
      const time = now / 1000;
      const dt = Math.min(Math.max(time - lastTime, 0), 0.05);
      lastTime = time;
      const target = pointer ?? mapAutonomousLight(time, placement);
      light = followLight(light, target, dt);
      pulseHold += ((pointer ? 1 : 0) - pulseHold) * (1 - Math.exp(-dt / PULSE_HOLD_SECONDS));
      activePipeline.setFrameUniforms(placement, light, frameIndex, time, pulseHold);
      activePipeline.draw(staticDirty);
      staticDirty = false;
      frameIndex += 1;
    });
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    resizeGeneration += 1;
    runCleanups([
      () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
      },
      () => observer?.disconnect(),
      () => visibilidade?.disconnect(),
      () => area.removeEventListener('pointermove', handlePointerMove),
      () => area.removeEventListener('pointerleave', handlePointerLeave),
      () => area.removeEventListener('pointercancel', handlePointerLeave),
      () => pipeline?.dispose(),
      () => output?.dispose(),
      () => imagem?.close(),
      () => reserva.soltar(),
    ]);
  };

  function fail(error: unknown): never {
    failed = true;
    try {
      dispose();
    } catch {
      // Teardown must not replace the live or initialization failure.
    }
    throw error;
  }

  function guard<T>(work: () => T): T {
    try {
      return work();
    } catch (error) {
      return fail(error);
    }
  }

  const initialize = async () => {
    const [{ surface }, gpu, bitmap] = await Promise.all([
      import('vgpu'),
      reserva.gpu,
      fetch(contorno)
        .then((resposta) => {
          if (!resposta.ok) throw new Error(`Contorno do busto indisponível (${resposta.status}).`);
          return resposta.blob();
        })
        .then((blob) => createImageBitmap(blob)),
    ]);
    imagem = bitmap;
    if (disposed) {
      bitmap.close();
      return;
    }
    raster = imageRaster(bitmap);
    output = surface(gpu, canvas, { autoResize: false, alphaMode: 'premultiplied', format: 'bgra8unorm' });
    pipeline = new FlarePipeline(gpu, output);
    await resize({
      width: Math.max(1, canvas.offsetWidth),
      height: Math.max(1, canvas.offsetHeight),
      dpr: window.devicePixelRatio || 1,
    });
    if (disposed) return;
    light = placement?.focus ?? light;
    area.addEventListener('pointermove', handlePointerMove);
    area.addEventListener('pointerleave', handlePointerLeave);
    area.addEventListener('pointercancel', handlePointerLeave);
    observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(canvas);
    visibilidade = new IntersectionObserver(([e]) => {
      naTela = !!e?.isIntersecting;
    });
    visibilidade.observe(canvas);
    animationFrame = requestAnimationFrame(frameLoop);
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed && !failed) return;
    fail(error);
  });

  return { ready, resize, dispose };
}
