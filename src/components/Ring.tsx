import type { ReactNode } from 'react';

interface Props {
  value: number;
  max: number;
  /** número = px; string = cualquier unidad CSS (p. ej. '4rem' para que escale con el texto) */
  size?: number | string;
  stroke?: number;
  color: string;
  track?: string;
  children?: ReactNode;
  label?: string;
}

/** Anillo de progreso SVG (estilo anillos de Actividad). Al superar el 100% se queda completo. */
export function Ring({ value, max, size = 76, stroke = 8, color, track, children, label }: Props) {
  // Se dibuja en un viewBox fijo de 100 y se escala; el grosor se ajusta en proporción
  const sw = (stroke / 76) * 100;
  const r = (100 - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track ?? 'var(--card-2)'} strokeWidth={sw} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="ring-label" aria-hidden={label ? true : undefined}>{children}</div>
    </div>
  );
}
