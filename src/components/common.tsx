import { useEffect, useState, type ReactNode } from 'react';
import type { QualityGrade } from '../types';
import { Ring } from './Ring';
import { IconChevronRight } from './Icons';
import { MACROS, fmt, type MacroKey } from '../lib/nutrition';

const GRADE_TEXT: Record<QualityGrade, string> = {
  A: 'muy saludable', B: 'saludable', C: 'intermedia', D: 'poco saludable', E: 'nada saludable'
};

export function GradeBadge({ grade }: { grade?: QualityGrade }) {
  if (!grade) return null;
  return (
    <span className={`grade grade-${grade}`} role="img" aria-label={`Calidad ${grade}, ${GRADE_TEXT[grade]}`}>
      {grade}
    </span>
  );
}

export function macroVar(k: MacroKey): string {
  return k;
}

interface MacroValues {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Cuatro anillos de macros. `size` en rem para que escalen con el texto. */
export function MacroRings({ value, target, size = 4.2 }: { value: MacroValues; target: MacroValues; size?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', justifyItems: 'center' }}>
      {MACROS.map((m) => (
        <div key={m.key} className="center" style={{ minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Ring
              value={value[m.key]}
              max={target[m.key]}
              size={`${size}rem`}
              stroke={7}
              color={m.color}
              track={`var(--${m.key}-bg)`}
              label={`${m.label}: ${fmt(value[m.key])} de ${fmt(target[m.key])} gramos`}
            >
              <span className="num" style={{ fontSize: `${size * 0.26}rem`, fontWeight: 600 }}>{fmt(value[m.key])}</span>
              <span className="faint num" style={{ fontSize: `${size * 0.16}rem` }}>/{fmt(target[m.key])} g</span>
            </Ring>
          </div>
          <div className="ellipsis small muted" style={{ marginTop: '0.35rem' }} aria-hidden="true">
            {m.key === 'carbs' ? 'Carbohid.' : m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, color, track, label, className = '' }: {
  value: number; max: number; color: string; track?: string; label?: string; className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={`bar ${className}`}
      style={{ background: track }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-hidden={label ? undefined : true}
    >
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-checked={checked} aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" />
    </span>
  );
}

/** Control segmentado accesible (cada opción anuncia si está seleccionada). */
export function Segmented<T extends string | number>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Celda de lista agrupada estilo Ajustes de iOS. */
export function Cell({ icon, title, sub, right, onClick, chevron = !!onClick, className = '', label }: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
  label?: string;
}) {
  const content = (
    <>
      {icon}
      <span className="grow">
        <span className="cell-title">{title}</span>
        {sub && <span className="cell-sub">{sub}</span>}
      </span>
      {right}
      {chevron && <IconChevronRight size={16} className="chevron" />}
    </>
  );
  return onClick ? (
    <button type="button" className={`cell ${className}`} onClick={onClick} aria-label={label}>{content}</button>
  ) : (
    <div className={`cell ${className}`}>{content}</div>
  );
}

/** Campo numérico que acepta coma decimal (teclado español de iOS). */
export function NumberInput({
  value, onChange, suffix, placeholder, autoFocus, decimal = true, label
}: {
  value: number | '';
  onChange: (v: number | '') => void;
  suffix?: string;
  placeholder?: string;
  autoFocus?: boolean;
  decimal?: boolean;
  label?: string;
}) {
  const show = (v: number | '') => (v === '' ? '' : String(v).replace('.', ','));
  const [text, setText] = useState(show(value));
  // Sincroniza si el valor cambia desde fuera (p. ej. al pulsar una ración)
  useEffect(() => {
    if (toNum(text) !== (value === '' ? 0 : value) || (value === '' && text !== '')) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="input-group">
      <input
        className="input num"
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={label}
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          let raw = e.target.value.replace(/[^\d.,]/g, '').replace('.', ',');
          if (!decimal) raw = raw.replace(/,/g, '');
          const parts = raw.split(',');
          if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('');
          setText(raw);
          const n = parseFloat(raw.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : '');
        }}
        style={suffix ? { paddingRight: '3.4rem' } : undefined}
      />
      {suffix && <span className="suffix" aria-hidden="true">{suffix}</span>}
    </div>
  );
}

export function toNum(v: number | '' | string): number {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
