import { useMemo } from 'react';
import type { AdaptiveCheck } from '../types';
import { Sheet } from '../components/Sheet';
import { ProgressBar, Switch } from '../components/common';
import { toast } from '../components/Toast';
import { actions, currentWeight, useAppState, useTargets } from '../store/store';
import { ADAPTIVE, evaluateAdaptive } from '../lib/adaptive';
import { diffDays, shortDate, todayKey } from '../lib/dates';
import { fmt, tdee as formulaTdee } from '../lib/nutrition';

function lastApplied(history: AdaptiveCheck[]): AdaptiveCheck | undefined {
  return [...history].reverse().find((h) => h.applied);
}

function explain(c: AdaptiveCheck): string {
  const rate = c.ratePerWeek;
  const trend = Math.abs(rate) < 0.05 ? 'tu peso se mantiene' : `tu tendencia ${rate < 0 ? 'baja' : 'sube'} ${fmt(Math.abs(rate), 2)} kg/semana`;
  return `Has comido ${fmt(c.avgIntake)} kcal de media y ${trend}: tu gasto real es de unas ${fmt(c.observedTdee)} kcal/día.`;
}

/** Tarjeta de Inicio: último ajuste (7 días) o progreso de la calibración */
export function AdaptiveCard({ onOpen }: { onOpen: () => void }) {
  const state = useAppState();
  const today = todayKey();
  const last = lastApplied(state.adaptive.history);
  const result = useMemo(() => evaluateAdaptive(state, today, currentWeight(state)), [state, today]);

  if (!state.adaptive.enabled || (state.profile.kcalOverride ?? 0) > 0) return null;

  if (last && diffDays(today, last.date) < 7) {
    const diff = last.target - last.prevTarget;
    return (
      <section className="card mt" aria-label="Ajuste semanal del objetivo">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.5rem' }} aria-hidden="true">🎯</span>
          <div className="grow">
            <b>{last.undone ? 'Ajuste deshecho' : diff === 0 ? 'Objetivo revisado: sin cambios' : 'Objetivo ajustado a tus datos'}</b>
            {!last.undone && diff !== 0 && (
              <div className="num" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0' }}>
                {fmt(last.prevTarget)} → {fmt(last.target)} kcal
                <span className="small" style={{ color: diff > 0 ? 'var(--good)' : 'var(--warn)', marginLeft: '0.4rem' }}>
                  ({diff > 0 ? '+' : ''}{fmt(diff)})
                </span>
              </div>
            )}
            <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{explain(last)}</p>
            <div className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
              {!last.undone && diff !== 0 && (
                <button className="btn sm gray" onClick={() => { actions.undoAdaptive(last.date); toast('Ajuste deshecho. Se revisará de nuevo la próxima semana', '↩️', 3500); }}>
                  Deshacer
                </button>
              )}
              <button className="btn sm secondary" onClick={onOpen}>Detalles</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (state.adaptive.tdee == null && !result.ok) {
    const p = result.progress;
    const pct = (Math.min(p.completeDays, ADAPTIVE.minCompleteDays) + Math.min(p.weighIns, ADAPTIVE.minWeighIns) * (ADAPTIVE.minCompleteDays / ADAPTIVE.minWeighIns)) / (ADAPTIVE.minCompleteDays * 2);
    return (
      <button className="card mt" style={{ width: '100%', textAlign: 'left' }} onClick={onOpen}
        aria-label={`Calibrando tu gasto real: ${p.completeDays} de ${ADAPTIVE.minCompleteDays} días completos y ${p.weighIns} de ${ADAPTIVE.minWeighIns} pesajes. Ver detalles`}>
        <div className="row">
          <span style={{ fontSize: '1.5rem' }} aria-hidden="true">🧪</span>
          <div className="grow">
            <b>Calibrando tu gasto real</b>
            <div className="small muted">
              {Math.min(p.completeDays, ADAPTIVE.minCompleteDays)}/{ADAPTIVE.minCompleteDays} días completos · {Math.min(p.weighIns, ADAPTIVE.minWeighIns)}/{ADAPTIVE.minWeighIns} pesajes
            </div>
            <ProgressBar value={pct} max={1} color="var(--kcal)" className="mt-s" />
          </div>
        </div>
      </button>
    );
  }
  return null;
}

/** Detalle y ajustes del objetivo adaptativo */
export function AdaptiveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const targets = useTargets();
  const today = todayKey();
  const w = currentWeight(state);
  const formula = Math.round(formulaTdee(state.profile, w));
  const result = useMemo(() => evaluateAdaptive(state, today, w), [state, today, w]);
  const manual = (state.profile.kcalOverride ?? 0) > 0;
  const history = [...state.adaptive.history].filter((h) => h.applied).reverse();

  return (
    <Sheet open={open} onClose={onClose} full title="Objetivo adaptativo">
      <div className="group">
        <div className="cell">
          <span className="grow">
            <span className="cell-title">Ajustar mi objetivo automáticamente</span>
            <span className="cell-sub">Cada semana, con lo que comes y tu tendencia de peso</span>
          </span>
          <Switch checked={state.adaptive.enabled} onChange={(v) => actions.setAdaptiveEnabled(v)} label="Ajustar mi objetivo automáticamente" />
        </div>
      </div>
      {manual && (
        <p className="section-footer" role="note">⏸️ En pausa: tienes un objetivo manual en Perfil › Objetivos. Bórralo para que vuelva a ajustarse.</p>
      )}

      <h3 className="section-header">Ahora mismo</h3>
      <div className="card small">
        <div className="row between"><span>Gasto según la fórmula</span><b className="num">{fmt(formula)} kcal</b></div>
        <div className="row between" style={{ marginTop: '0.35rem' }}>
          <span>Gasto según tus datos</span>
          <b className="num">{state.adaptive.tdee != null ? `${fmt(state.adaptive.tdee)} kcal` : 'Calibrando…'}</b>
        </div>
        <div className="row between" style={{ marginTop: '0.35rem' }}><span>Tu objetivo diario</span><b className="num">{fmt(targets.kcal)} kcal</b></div>
      </div>

      <h3 className="section-header">{result.ok ? 'Próxima revisión' : 'Qué falta para la próxima revisión'}</h3>
      <div className="card small">
        <div className="row between"><span>Días completos (últimas 5 semanas)</span><b className="num">{result.progress.completeDays}/{ADAPTIVE.minCompleteDays}</b></div>
        <div className="row between" style={{ marginTop: '0.35rem' }}><span>Pesajes (últimas 5 semanas)</span><b className="num">{result.progress.weighIns}/{ADAPTIVE.minWeighIns}</b></div>
        {!result.ok && (
          <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem' }} className="muted">
            {result.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        {result.ok && <p className="muted" style={{ margin: '0.6rem 0 0' }}>Hay datos suficientes. {explain(result.check)}</p>}
      </div>

      <h3 className="section-header">Historial</h3>
      {history.length ? (
        <div className="group">
          {history.map((h) => (
            <div key={h.date} className="cell">
              <span className="grow">
                <span className="cell-title num">{shortDate(h.date)} · {fmt(h.prevTarget)} → {fmt(h.target)} kcal{h.undone ? ' (deshecho)' : ''}</span>
                <span className="cell-sub">{explain(h)}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted">Aún no hay revisiones.</p>
      )}

      <h3 className="section-header">Cómo funciona</h3>
      <div className="small muted" style={{ lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          Una vez por semana compara lo que has comido (solo los <b>días completos</b>: 3 comidas o más y no marcados como incompletos)
          con cómo cambia tu peso en las últimas 5 semanas. 1 kg equivale a unas 7.700 kcal, así que de ahí sale tu gasto real.
        </p>
        <p>
          Para que no dé bandazos, el cambio es gradual: <b>como máximo ±150 kcal por semana</b>, y nunca baja de tu metabolismo basal
          ni de los mínimos de seguridad. El ejercicio que registras se sigue sumando aparte, sin contarlo dos veces.
        </p>
        <p style={{ marginBottom: 0 }}>
          Si un día no registras todo, márcalo en el Diario como <b>“No registré todo”</b>: si no, la app pensaría que comiste menos y bajaría tu objetivo sin motivo.
        </p>
      </div>
      {state.adaptive.tdee != null && (
        <button className="btn block danger mt" style={{ background: 'var(--card)' }}
          onClick={() => {
            const prev = state.adaptive;
            actions.resetAdaptive();
            toast('Calibración reiniciada', '🧪', undefined, { label: 'Deshacer', run: () => actions.restore({ adaptive: prev }) });
          }}>
          Reiniciar calibración
        </button>
      )}
    </Sheet>
  );
}
