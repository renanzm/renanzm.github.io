import type { CSSProperties } from 'react';
import { ASSINATURA } from './tracos-assinatura';

const MARGEM = 6;

/** A assinatura em traços vetoriais. Sem animação, aparece inteira; a animação a "escreve"
 * traço por traço (ver movimento/assinatura.ts). */
export function Assinatura({ className = '' }: { className?: string }) {
  const { largura, altura, tracos } = ASSINATURA;
  return (
    <svg
      className={`assinatura ${className}`}
      viewBox={`${-MARGEM} ${-MARGEM} ${largura + 2 * MARGEM} ${altura + 2 * MARGEM}`}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {tracos.map((t, i) => (
          <path key={i} d={t.d} style={{ '--w': t.largura } as CSSProperties} data-comprimento={t.comprimento} />
        ))}
      </g>
    </svg>
  );
}
