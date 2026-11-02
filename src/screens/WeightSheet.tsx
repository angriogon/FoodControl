import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { NumberInput, toNum } from '../components/common';
import { IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, currentWeight, useAppState } from '../store/store';
import { shortDate, todayKey } from '../lib/dates';
import { fmt } from '../lib/nutrition';

export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const [kg, setKg] = useState<number | ''>('');
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (open) {
      setKg(currentWeight(state));
      setDate(todayKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const value = toNum(kg);
  const valid = value >= 25 && value <= 400 && date <= todayKey();
  const prev = [...state.weights].reverse().find((w) => w.date < date);
  const delta = prev ? value - prev.kg : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar peso"
      footer={
        <button
          className="btn block"
          disabled={!valid}
          onClick={() => {
            actions.addWeight({ date, kg: Math.round(value * 10) / 10 });
            toast(delta != null && delta < 0 ? `¡${fmt(-delta, 1)} kg menos!` : 'Peso guardado', '⚖️');
            onClose();
          }}
        >
          Guardar
        </button>
      }
    >
      <div className="stepper row" style={{ justifyContent: 'center', gap: '1.06rem', margin: '0.47rem 0 0.35rem' }}>
        <button className="icon-btn" style={{ width: '3rem', height: '3rem', fontSize: '1.4rem', color: 'var(--accent)' }} onClick={() => setKg(Math.round((value - 0.1) * 10) / 10)} aria-label="Restar 0,1 kg">−</button>
        <div className="center">
          <div className="num" style={{ fontSize: '3.06rem', fontWeight: 700 }}>{fmt(value, 1)}</div>
          <div className="muted">kg</div>
        </div>
        <button className="icon-btn" style={{ width: '3rem', height: '3rem', fontSize: '1.4rem', color: 'var(--accent)' }} onClick={() => setKg(Math.round((value + 0.1) * 10) / 10)} aria-label="Sumar 0,1 kg">+</button>
      </div>
      {delta != null && Math.abs(delta) >= 0.05 && (
        <p className="center small" style={{ color: delta < 0 ? 'var(--good)' : 'var(--warn)', margin: '0 0 0.71rem' }}>
          {delta < 0 ? '▼' : '▲'} {fmt(Math.abs(delta), 1)} kg desde el {shortDate(prev!.date)}
        </p>
      )}
      <div className="grid-2">
        <div className="field">
          <label>Peso exacto</label>
          <NumberInput value={kg} onChange={setKg} suffix="kg" />
        </div>
        <div className="field">
          <label>Fecha</label>
          <input className="input" type="date" value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>
      <p className="small faint">Consejo: pésate siempre en las mismas condiciones (al levantarte, tras ir al baño y antes de desayunar).</p>

      {state.weights.length > 0 && (
        <>
          <div className="field-label" style={{ marginTop: '1.06rem' }}>Historial</div>
          <div className="group">
            {[...state.weights].reverse().slice(0, 30).map((w) => (
              <div key={w.date} className="cell">
                <span className="grow">{shortDate(w.date)}</span>
                <b className="num">{fmt(w.kg, 1)} kg</b>
                <button className="icon-btn" onClick={() => actions.removeWeight(w.date)} aria-label="Eliminar registro">
                  <IconTrash size={18} color="var(--danger)" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
