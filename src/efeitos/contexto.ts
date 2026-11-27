/* Um contexto de GPU (device) dividido pelos efeitos do site: o oceano da abertura, a gota de
 * vidro do "Sobre" e o fundo de luz das páginas de projeto. Os exemplos do vgpu criam um
 * contexto cada; aqui cada efeito reserva o mesmo e solta quando sai, e o último a sair o libera
 * (gpu.dispose(), como nos exemplos). O vgpu só é baixado quando o primeiro efeito pede a GPU. */
import type { Gpu } from 'vgpu';

let pedido: Promise<Gpu> | undefined;
let usuarios = 0;

export interface ReservaDeGpu {
  readonly gpu: Promise<Gpu>;
  soltar(): void;
}

export function reservarGpu(): ReservaDeGpu {
  usuarios++;
  if (!pedido) {
    const este = import('vgpu').then(({ init }) => init());
    pedido = este;
    este.catch(() => {
      if (pedido === este) pedido = undefined;
    });
  }
  const meu = pedido;
  let solto = false;
  return {
    gpu: meu,
    soltar() {
      if (solto) return;
      solto = true;
      usuarios = Math.max(0, usuarios - 1);
      if (usuarios > 0) return;
      if (pedido === meu) pedido = undefined;
      meu.then(
        (gpu) => gpu.dispose(),
        () => {},
      );
    },
  };
}
