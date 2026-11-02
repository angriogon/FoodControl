import type { ReactNode } from 'react';

interface Props {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: ReactNode;
}

/** Anillo de progreso SVG. Al superar el 100% se mantiene completo. */
export function Ring({ value, max, size = 76, stroke = 7, color, track, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'var(--card-2)'} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}
