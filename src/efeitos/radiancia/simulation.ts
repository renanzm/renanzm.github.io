/* Adaptado de simulation.ts do exemplo "Radiance Cascades" do vgpu.
 *
 * Igual ao exemplo: os alvos HDR (emissores, sementes do jump flood em rgba32float, campo de
 * distância, dois atlas reciclados), o número de cascatas pelo tamanho da cena, o jump flood, as
 * cascatas de cima para baixo e o present com tonemap ACES e sRGB num passe só. Os shaders de
 * jump flood, distância e cascatas estão sem mudanças.
 *
 * Diferente:
 *   - o triângulo de luz tem centro, cor e raio escolhidos pela página (raio zero: sem ele), e os
 *     traços também podem ter uma cor só e o raio que a página quiser;
 *   - o present desenha a grade nítida em px de CSS mesmo com a cena em resolução menor, com o
 *     brilho da grade separado do dos traços;
 *   - a escala da cena segue a área da tela, com um teto (escalaDaCena);
 *   - sem os modos de depuração (emissores, distância, atlas) e o lil-gui do exemplo. */
import {
  effect,
  frame,
  sampler,
  target,
  type Effect,
  type Gpu,
  type Surface,
  type Target,
} from 'vgpu';

import type { PaintSegment } from './pintura';
import jfaInitWgsl from './jfa-init.wgsl';
import jfaPassWgsl from './jfa-pass.wgsl';
import paintEmitterWgsl from './paint-emitter.wgsl';
import presentWgsl from './present.wgsl';
import radianceCascadeWgsl from './radiance-cascade.wgsl';
import sdfFinalizeWgsl from './sdf-finalize.wgsl';

type Output = Surface | Target;
type Vec2 = readonly [number, number];
type Vec3 = readonly [number, number, number];

const HDR_FORMAT: GPUTextureFormat = 'rgba16float';
// Seeds store absolute pixel coordinates, which need f32 precision past 2048.
const SEED_FORMAT: GPUTextureFormat = 'rgba32float';
const RC_INTERVAL0 = 2;

/** Teto de pixels da cena: até 1920×1080 a luz é calculada na resolução de CSS da tela; acima
 * disso, a escala cai o bastante para não passar daqui (a memória de vídeo cresce com a área). */
const PIXELS_MAXIMOS = 1920 * 1080;

/** Escala da cena (luz) em relação aos px de CSS de uma área de largura × altura. */
export function escalaDaCena(largura: number, altura: number): number {
  return Math.min(1, Math.sqrt(PIXELS_MAXIMOS / Math.max(1, largura * altura)));
}

/** Cor de cada traço pintado: a mesma sequência de matizes do exemplo. */
export function strokeRadiance(index: number): Vec3 {
  const hue = (index * 0.381966) % 1;
  const channel = (offset: number) => {
    const value = Math.abs(((hue + offset) % 1) * 6 - 3) - 1;
    return (0.25 + 0.75 * Math.min(1, Math.max(0, value))) * 2.7;
  };
  return [channel(0), channel(2 / 3), channel(1 / 3)];
}

export function createScene(gpu: Gpu, requestedSize: Vec2) {
  const width = Math.max(1, Math.floor(requestedSize[0]));
  const height = Math.max(1, Math.floor(requestedSize[1]));
  const size: Vec2 = [width, height];
  const cascadeCount = Math.min(
    6,
    Math.max(5, Math.ceil(Math.log(1 + (3 * Math.hypot(width, height)) / RC_INTERVAL0) / Math.log(4))),
  );
  const spacing = 2 ** (cascadeCount - 1);
  const atlas: Vec2 = [Math.ceil(width / spacing) * spacing * 2, Math.ceil(height / spacing) * spacing * 2];
  const jumpCount = Math.ceil(Math.log2(Math.max(width, height, 2)));
  const jumps = [...Array.from({ length: jumpCount }, (_, index) => Math.max(1, 2 ** (jumpCount - index - 1))), 1, 1];
  const created: object[] = [];
  const own = <T extends object>(resource: T) => {
    created.push(resource);
    return resource;
  };

  try {
    const emitter: [Target, Target] = [
      own(target(gpu, { size, format: HDR_FORMAT })),
      own(target(gpu, { size, format: HDR_FORMAT })),
    ];
    const jfa: [Target, Target] = [
      own(target(gpu, { size, format: SEED_FORMAT })),
      own(target(gpu, { size, format: SEED_FORMAT })),
    ];
    const sdf = own(target(gpu, { size, format: HDR_FORMAT }));
    // Two atlases are recycled from the top of the hierarchy down.
    const cascades: [Target, Target] = [
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
    ];
    return {
      gpu,
      size,
      atlas,
      cascadeCount,
      jumps,
      emitter,
      jfa,
      sdf,
      cascades,
      effects: {
        emissor: effect(gpu, paintEmitterWgsl),
        jfaInit: effect(gpu, jfaInitWgsl),
        // Uniforms are uploaded immediately, so every encoded pass needs its own effect.
        jfaSteps: jumps.map(() => effect(gpu, jfaPassWgsl)),
        sdfFinalize: effect(gpu, sdfFinalizeWgsl),
        cascade: Array.from({ length: cascadeCount }, () => effect(gpu, radianceCascadeWgsl)),
        present: effect(gpu, presentWgsl),
      },
      sampler: sampler(gpu, {
        minFilter: 'linear',
        magFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      }),
    };
  } catch (error) {
    try {
      destroyResources(created);
    } catch {
      // Preserve the allocation error after best-effort rollback.
    }
    throw error;
  }
}

export type RadianceScene = ReturnType<typeof createScene>;

export async function prepareScene(scene: RadianceScene, outputFormat: GPUTextureFormat): Promise<void> {
  await Promise.all([
    scene.effects.emissor.compile({ colors: [HDR_FORMAT] }),
    scene.effects.jfaInit.compile({ colors: [SEED_FORMAT] }),
    ...scene.effects.jfaSteps.map((shader) => shader.compile({ colors: [SEED_FORMAT] })),
    scene.effects.sdfFinalize.compile({ colors: [HDR_FORMAT] }),
    ...scene.effects.cascade.map((shader) => shader.compile({ colors: [HDR_FORMAT] })),
    scene.effects.present.compile({ colors: [outputFormat] }),
  ]);
}

/** Libera os alvos e os efeitos da cena (o contexto é dividido, então não basta gpu.dispose()). */
export function destroyScene(scene: RadianceScene): void {
  const effects: Effect[] = [
    scene.effects.emissor,
    scene.effects.jfaInit,
    ...scene.effects.jfaSteps,
    scene.effects.sdfFinalize,
    ...scene.effects.cascade,
    scene.effects.present,
  ];
  for (const shader of effects) shader.dispose();
  destroyResources([...scene.emitter, ...scene.jfa, scene.sdf, ...scene.cascades]);
}

function destroyResources(resources: readonly object[]): void {
  let firstError: unknown;
  for (let index = resources.length - 1; index >= 0; index--) {
    try {
      (resources[index] as { destroy?: () => void }).destroy?.();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
}

export interface ChainOptions {
  /** O trecho que o cursor acabou de pintar. */
  readonly segment?: PaintSegment;
  readonly keepPrevious?: boolean;
  /** Centro (px da cena), raio (px da cena) e radiância do triângulo de luz. */
  readonly triangulo?: { readonly centro: Vec2; readonly raio: number; readonly radiancia: Vec3 };
  /** Cor (radiância) de todos os traços; sem ela, cada traço tem a sua, como no exemplo. */
  readonly corTraco?: Vec3;
  /** Raio do traço, em px da cena (o do exemplo é 5). */
  readonly raioTraco?: number;
}

function buildChain(scene: RadianceScene, options: ChainOptions) {
  const { size, effects } = scene;
  const passes: { readonly target: Target; readonly effect: Effect }[] = [];

  const [emitterRead, emitterWrite] = scene.emitter;
  const segment = options.segment;
  const color = options.corTraco ?? strokeRadiance(segment?.stroke ?? 0);
  const triangulo = options.triangulo;
  // O triângulo quente do exemplo, no centro, é o padrão
  const [tr, tg, tb] = triangulo?.radiancia ?? [3.8, 3.2, 2.4];
  effects.emissor.set({
    paint: {
      stroke_from: segment ? [segment.from[0] * size[0], segment.from[1] * size[1]] : [0, 0],
      stroke_to: segment ? [segment.to[0] * size[0], segment.to[1] * size[1]] : [0, 0],
      color: [color[0], color[1], color[2], segment ? 1 : 0],
      flags: [
        (options.keepPrevious ?? true) ? 1 : 0,
        triangulo?.raio ?? Math.min(size[0], size[1]) * 0.11,
        triangulo?.centro[0] ?? size[0] * 0.5,
        triangulo?.centro[1] ?? size[1] * 0.5,
      ],
      triangle: [tr, tg, tb, options.raioTraco ?? 5],
    },
    previous: emitterRead,
  });
  passes.push({ target: emitterWrite, effect: effects.emissor });
  scene.emitter = [emitterWrite, emitterRead];

  effects.jfaInit.set({ emitter: emitterWrite });
  passes.push({ target: scene.jfa[0], effect: effects.jfaInit });

  let seedRead = scene.jfa[0];
  let seedWrite = scene.jfa[1];
  scene.jumps.forEach((jump, index) => {
    const shader = effects.jfaSteps[index]!;
    shader.set({ jfa: { jump: [jump, 0, 0, 0] }, seeds: seedRead });
    passes.push({ target: seedWrite, effect: shader });
    [seedRead, seedWrite] = [seedWrite, seedRead];
  });
  scene.jfa = [seedRead, seedWrite];

  effects.sdfFinalize.set({ seeds: seedRead });
  passes.push({ target: scene.sdf, effect: effects.sdfFinalize });

  let atlasWrite = scene.cascades[0];
  let atlasRead = scene.cascades[1];
  for (let cascade = scene.cascadeCount - 1; cascade >= 0; cascade--) {
    const shader = effects.cascade[cascade]!;
    shader.set({
      rc: { state: [cascade, cascade < scene.cascadeCount - 1 ? 1 : 0, 0, 0] },
      sdf_tex: scene.sdf,
      sdf_samp: scene.sampler,
      emitter_tex: emitterWrite,
      emitter_samp: scene.sampler,
      upper_tex: atlasRead,
    });
    passes.push({ target: atlasWrite, effect: shader });
    [atlasRead, atlasWrite] = [atlasWrite, atlasRead];
  }
  scene.cascades = [atlasRead, atlasWrite];
  return passes;
}

export function runChain(scene: RadianceScene, options: ChainOptions = {}): void {
  const passes = buildChain(scene, options);
  frame(scene.gpu, (currentFrame) => {
    for (const pass of passes) {
      currentFrame.pass({ target: pass.target, clear: [0, 0, 0, 0] }, (encoder) => encoder.draw(pass.effect));
    }
  });
}

export interface PresentOptions {
  /** Força da luz: 0 apaga, 1 é a do exemplo. */
  readonly intensidade: number;
  /** Brilho da grade iluminada (1 é o do exemplo); os traços não mudam. */
  readonly fundo?: number;
  /** Px de saída por px de CSS (o dpr da superfície), para a grade ficar nítida. */
  readonly dpr?: number;
}

export function presentScene(scene: RadianceScene, output: Output, options: PresentOptions): void {
  scene.effects.present.set({
    present: { view: [0, options.fundo ?? 1, options.dpr ?? 1, options.intensidade] },
    cascade_tex: scene.cascades[0],
    emitter_tex: scene.emitter[0],
    sdf_tex: scene.sdf,
  });
  frame(scene.gpu, (currentFrame) => {
    currentFrame.pass({ target: output, clear: [0, 0, 0, 1] }, (encoder) => encoder.draw(scene.effects.present));
  });
}
