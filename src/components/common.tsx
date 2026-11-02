import { useEffect, useState } from 'react';
import type { QualityGrade } from '../types';
import { Ring } from './Ring';
import { MACROS, fmt, type MacroKey } from '../lib/nutrition';

export function GradeBadge({ grade }: { grade?: QualityGrade }) {
  if (!grade) return null;
  return (
    <span className={`grade grade-${grade}`} title={`Calidad ${grade}`}>
      {grade}
    </span>
  );
}

interface MacroValues {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Cuatro anillos de macros (Grasa, Proteínas, Carbohidratos, Fibra). */
export function MacroRings({ value, target, size = 76 }: { value: MacroValues; target: MacroValues; size?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, justifyItems: 'center' }}>
      {MACROS.map((m) => (
        <div key={m.key} className="center" style={{ minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Ring value={value[m.key]} max={target[m.key]} size={size} color={m.color} track={`var(--${macroVar(m.key)}-bg)`}>
              <span className="num" style={{ fontSize: size * 0.27, fontWeight: 600 }}>{fmt(value[m.key])}</span>
              <span className="faint num" style={{ fontSize: size * 0.17 }}>/ {fmt(target[m.key])} g</span>
            </Ring>
          </div>
          <div className="ellipsis" style={{ marginTop: 8, fontSize: 15 }}>{m.key === 'carbs' ? 'Carbohid.' : m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function macroVar(k: MacroKey): string {
  return k === 'protein' ? 'protein' : k === 'carbs' ? 'carbs' : k === 'fat' ? 'fat' : 'fiber';
}

export function ProgressBar({ value, max, color, track }: { value: number; max: number; color: string; track?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar" style={{ background: track }}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <span className="sr-only">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

/** Campo numérico que acepta coma decimal (teclado español de iOS). */
export function NumberInput({
  value, onChange, suffix, placeholder, autoFocus, decimal = true
}: {
  value: number | '';
  onChange: (v: number | '') => void;
  suffix?: string;
  placeholder?: string;
  autoFocus?: boolean;
  decimal?: boolean;
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
        style={suffix ? { paddingRight: 56 } : undefined}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

export function toNum(v: number | '' | string): number {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
