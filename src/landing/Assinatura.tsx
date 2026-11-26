import { useId, type CSSProperties } from 'react';
import { ASSINATURA } from './tracos-assinatura';

const MARGEM = 12;

/** A assinatura: o contorno exato da tinta (preenchido) e, na máscara, o caminho da caneta.
 * Sem animação ela aparece inteira; a animação liga a máscara e a "escreve" traço por traço,
 * revelando a tinta na ordem da escrita (ver movimento/assinatura.ts). */
export function Assinatura({ className = '' }: { className?: string }) {
  const { largura, altura, contorno, tracos } = ASSINATURA;
  // O id vai dentro de url(#...): só letras e números
  const mascara = `caneta-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const caixa = { x: -MARGEM, y: -MARGEM, width: largura + 2 * MARGEM, height: altura + 2 * MARGEM };
  return (
    <svg
      className={`assinatura ${className}`}
      viewBox={`${caixa.x} ${caixa.y} ${caixa.width} ${caixa.height}`}
      aria-hidden="true"
      focusable="false"
      data-mascara={mascara}
    >
      <defs>
        <mask id={mascara} maskUnits="userSpaceOnUse" {...caixa}>
          <g className="caneta" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
            {tracos.map((t, i) => (
              <path
                key={i}
                d={t.d}
                style={{ '--w': t.largura } as CSSProperties}
                data-comprimento={t.comprimento}
                data-continua={t.continua ? '' : undefined}
              />
            ))}
          </g>
        </mask>
      </defs>
      <path className="tinta" d={contorno} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
