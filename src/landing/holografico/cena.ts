/* Adaptado de scene.ts do exemplo "Holographic Card" do vgpu: o mesmo efeito de tela cheia,
 * agora sem a textura com o texto do exemplo (que era a marca dele) e com o raio do canto da
 * moldura, para a borda acender no lugar certo. */
import { effect, type Gpu, type Target } from 'vgpu';
import fragment from './holografico.wgsl';

export function criarCena(gpu: Gpu, saida: Target) {
  return effect(gpu, fragment, {
    label: 'cartao-holografico',
    set: {
      params: { resolution: saida.size, tilt: [0, 0], pointer: [0.2, -0.25], hover: 0, corner: 0 },
    },
  });
}
