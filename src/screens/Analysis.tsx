import { useState } from 'react';
import type { FoodEntry, MealId } from '../types';
import { Sheet } from '../components/Sheet';
import { Ring } from '../components/Ring';
import { GradeBadge, MacroRings, macroVar } from '../components/common';
import { IconChevronDown, IconInfo } from '../components/Icons';
import { useAppState, useDay, useTargets } from '../store/store';
import {
  MACROS, MACRO_SUGGESTIONS, MEALS, burnedKcal, dayQuality, fmt, macroStatus, qualityLabel, sumNutrients, type MacroKey
} from '../lib/nutrition';
import { longDate, todayKey } from '../lib/dates';

const MEAL_COLORS: Record<MealId, string> = {
  desayuno: '#F0A04B',
  comida: '#B9CF3F',
  cena: '#2BB39B',
  snacks: '#8EAEDD'
};

export function AnalysisSheet({ open, onClose, date, meal }: { open: boolean; onClose: () => void; date: string; meal?: MealId }) {
  const day = useDay(date);
  const state = useAppState();
  const fullTargets = useTargets();
  const [showMore, setShowMore] = useState(false);

  if (!open) return null;

  const entries = meal ? day.entries.filter((e) => e.meal === meal) : day.entries;
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  const ratio = meal ? state.profile.mealSplit[meal] / 100 : 1;
  const targets = {
    kcal: Math.round(fullTargets.kcal * ratio),
    protein: Math.round(fullTargets.protein * ratio),
    carbs: Math.round(fullTargets.carbs * ratio),
    fat: Math.round(fullTargets.fat * ratio),
    fiber: Math.round(fullTargets.fiber * ratio)
  };
  const burned = meal ? 0 : burnedKcal(day);
  const budget = targets.kcal + (state.profile.addExerciseKcal ? burned : 0);
  const quality = qualityLabel(dayQuality(entries));
  const mealsLogged = new Set(day.entries.map((e) => e.meal)).size;
  const general = generalInsight({ kcal: totals.kcal, target: budget, date, mealMode: !!meal, mealsLogged, protein: totals.protein, proteinTarget: targets.protein });

  // % de las kcal que aporta cada macro
  const macroKcal = MACROS.map((m) => ({ ...m, kcal: totals[m.key] * m.kcalPerG }));
  const sumMacroKcal = macroKcal.reduce((s, m) => s + m.kcal, 0);

  // Avance del día: a las 14:00 de hoy es normal llevar ~50%
  const timeFactor = !meal && date === todayKey() ? Math.min(1, Math.max(0.35, (new Date().getHours() - 6) / 15)) : 1;

  const mealTitle = meal ? MEALS.find((m) => m.id === meal)!.label : null;

  return (
    <Sheet open={open} onClose={onClose} full title={mealTitle ? `Análisis · ${mealTitle}` : 'Análisis diario ✨'}>
      <p className="muted" style={{ marginTop: -4 }}>{longDate(date)}</p>

      {!entries.length ? (
        <div className="card center" style={{ padding: 30 }}>
          <div style={{ fontSize: 44 }}>🍽️</div>
          <p className="muted">Aún no hay alimentos registrados{meal ? ' en esta comida' : ' este día'}.</p>
        </div>
      ) : (
        <>
          {/* General */}
          <div className="card">
            <div className="row"><b>⭐ Análisis general</b></div>
            <h3 style={{ fontSize: 21, margin: '12px 0 8px' }}>{general.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{general.text}</p>
            {!meal && (
              <p style={{ fontWeight: 600, margin: '14px 0 0' }}>
                <span className="grade" style={{ background: 'var(--primary)', color: 'var(--primary-text)', borderRadius: 99 }}>{mealsLogged}</span>{' '}
                comida{mealsLogged === 1 ? '' : 's'} registrada{mealsLogged === 1 ? '' : 's'}
              </p>
            )}
            <div className="row" style={{ marginTop: 18, alignItems: 'flex-start', gap: 6 }}>
              <div className="center">
                <Ring value={totals.kcal} max={budget} size={82} stroke={7} color={totals.kcal > budget * 1.1 ? 'var(--bad)' : 'var(--good)'}>
                  <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(Math.abs(budget - totals.kcal))}</span>
                </Ring>
                <div className="small" style={{ marginTop: 6 }}>{budget - totals.kcal >= 0 ? 'kcal rest.' : 'kcal de más'}</div>
              </div>
              <div className="grow">
                <MacroRings value={totals} target={targets} size={60} />
              </div>
            </div>
          </div>

          {/* Calidad */}
          <div className="card">
            <div className="row between"><b style={{ color: '#2C4A7C' }}>💙 Calidad de alimentos</b><IconInfo size={20} className="faint" /></div>
            <div className="row" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 40 }}>{quality.tone === 'good' ? '😊' : quality.tone === 'ok' ? '😐' : quality.tone === 'bad' ? '😟' : '🤔'}</span>
              <b style={{ fontSize: 24 }}>{quality.label}</b>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>{quality.text}</p>
            <BestWorst entries={entries} />
          </div>

          <h2 className="section-title">Análisis de macros</h2>

          {/* Desglose macro */}
          <div className="card">
            <b style={{ color: '#B49A00' }}>👁️ Desglose macro</b>
            <p className="muted small">De dónde vienen tus calorías.</p>
            <StackedBar parts={macroKcal.map((m) => ({ value: m.kcal, color: m.color, key: m.key }))} total={sumMacroKcal} />
            <div className="row" style={{ flexWrap: 'wrap', gap: '6px 16px', marginTop: 12 }}>
              {macroKcal.map((m) => (
                <span key={m.key} className="row small" style={{ gap: 6 }}>
                  <Dot color={m.color} /> {m.label}
                </span>
              ))}
            </div>
            <div className="card flat small" style={{ marginTop: 14, padding: 14 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Comparado con tu objetivo</div>
              {(['protein', 'carbs', 'fat'] as const).map((k) => {
                const m = macroKcal.find((x) => x.key === k)!;
                const real = sumMacroKcal ? Math.round((m.kcal / sumMacroKcal) * 100) : 0;
                return (
                  <div key={k} className="row between">
                    <span>{m.label}</span>
                    <span className="num"><b>{real}%</b> <span className="faint">/ {state.profile.macroSplit[k]}%</span></span>
                  </div>
                );
              })}
            </div>
            <p style={{ marginBottom: 0 }}>{macroInsight(macroKcal, sumMacroKcal, state.profile.macroSplit)}</p>
          </div>

          {/* Desglose por comidas */}
          {!meal && (
            <div className="card">
              <b style={{ color: '#E08A2E' }}>🍽️ Desglose de comidas</b>
              <p className="muted small">Cómo se reparten tus calorías.</p>
              <div className="row between" style={{ fontWeight: 600, margin: '6px 0 10px' }}>
                <span>Calorías consumidas</span><span className="num">{fmt(totals.kcal)} kcal</span>
              </div>
              <StackedBar
                parts={MEALS.map((m) => ({ key: m.id, color: MEAL_COLORS[m.id], value: sumNutrients(day.entries.filter((e) => e.meal === m.id).map((e) => e.nutrients)).kcal }))}
                total={totals.kcal}
              />
              <div className="grid-2" style={{ marginTop: 14 }}>
                {MEALS.map((m) => {
                  const k = sumNutrients(day.entries.filter((e) => e.meal === m.id).map((e) => e.nutrients)).kcal;
                  return (
                    <div key={m.id} className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                      <Dot color={MEAL_COLORS[m.id]} size={14} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.label}</div>
                        <div className="num small"><b>{fmt(k)}</b> <span className="faint">/ {fullTargets.meals[m.id]} kcal</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalle por macro */}
          {MACROS.map((m) => (
            <MacroDetail key={m.key} k={m.key} label={m.label} color={m.color} value={totals[m.key]} target={targets[m.key]}
              entries={entries} timeFactor={timeFactor} extra={m.key === 'fat' ? [['Grasa saturada', totals.satFat ?? 0]] : m.key === 'carbs' ? [['Azúcares', totals.sugar ?? 0]] : []} />
          ))}

          <button className="link" style={{ margin: '18px auto 0', display: 'flex' }} onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Ocultar' : 'Mostrar'} cómo se calcula <IconChevronDown size={18} style={{ transform: showMore ? 'rotate(180deg)' : undefined }} />
          </button>
          {showMore && (
            <p className="small muted">
              Objetivos calculados con la fórmula Mifflin-St Jeor y tu nivel de actividad. La calidad usa el Nutri-Score de
              Open Food Facts cuando existe, o una estimación propia (proteína y fibra suman; azúcar, grasa saturada y sal restan).
              Es orientativo y no sustituye el consejo de un profesional sanitario.
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

function Dot({ color, size = 12 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: color, display: 'inline-block', flexShrink: 0, marginTop: 3 }} />;
}

function StackedBar({ parts, total }: { parts: { key: string; value: number; color: string }[]; total: number }) {
  const visible = parts.filter((p) => p.value > 0);
  return (
    <div style={{ display: 'flex', gap: 4, height: 40 }}>
      {visible.map((p) => {
        const pct = total > 0 ? (p.value / total) * 100 : 0;
        return (
          <div key={p.key} style={{ flex: `${pct} 0 0`, background: p.color, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 15, minWidth: 8, overflow: 'hidden' }}>
            {pct >= 9 ? `${Math.round(pct)}%` : ''}
          </div>
        );
      })}
      {!visible.length && <div style={{ flex: 1, background: 'var(--card-2)', borderRadius: 12 }} />}
    </div>
  );
}

function MacroDetail({ k, label, color, value, target, entries, timeFactor, extra }: {
  k: MacroKey; label: string; color: string; value: number; target: number; entries: FoodEntry[]; timeFactor: number; extra: [string, number][];
}) {
  const status = macroStatus(value, target, timeFactor);
  const sources = entries.filter((e) => e.nutrients[k] > 0).sort((a, b) => b.nutrients[k] - a.nutrients[k]);
  const top = sources[0];
  const pct = value > 0 && top ? Math.round((top.nutrients[k] / value) * 100) : 0;
  const low = status.tone === 'warn' && value < target;
  return (
    <div className="card">
      <div className="row between"><b style={{ fontSize: 19 }}>{label}</b></div>
      <div className="bar lg" style={{ marginTop: 12, background: `var(--${macroVar(k)}-bg)` }}>
        <span style={{ width: `${Math.min(100, target ? (value / target) * 100 : 0)}%`, background: color }} />
        <span className="bar-label">{fmt(value)}/{fmt(target)} g</span>
      </div>
      <div className={`status ${status.tone}`} style={{ marginTop: 10 }}>
        {status.tone === 'good' ? '✅' : status.tone === 'ok' ? '🟡' : '🟠'} {status.label}
      </div>
      {extra.map(([l, v]) => (
        <div key={l} className="row between" style={{ marginTop: 10 }}>
          <span>{l}</span><b className="num">{fmt(v, 1)} g</b>
        </div>
      ))}
      {top && (
        <p style={{ marginBottom: low ? 8 : 0 }}>
          <b>{top.name}</b> es tu principal fuente de {label.toLowerCase()}, con el {pct}% del total.
        </p>
      )}
      {low && (
        <>
          <b>Puedes añadir, por ejemplo:</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            {MACRO_SUGGESTIONS[k].slice(0, 3).map((s) => <li key={s}>{s}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function BestWorst({ entries }: { entries: FoodEntry[] }) {
  const best = entries.filter((e) => e.grade === 'A' || e.grade === 'B').slice(0, 3);
  const worst = entries.filter((e) => e.grade === 'D' || e.grade === 'E').slice(0, 3);
  if (!best.length && !worst.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      {best.length > 0 && <div className="small muted" style={{ marginBottom: 4 }}>Lo mejor</div>}
      {best.map((e) => <div key={e.id} className="row small" style={{ padding: '3px 0' }}><GradeBadge grade={e.grade} /><span className="ellipsis">{e.name}</span></div>)}
      {worst.length > 0 && <div className="small muted" style={{ margin: '10px 0 4px' }}>A moderar</div>}
      {worst.map((e) => <div key={e.id} className="row small" style={{ padding: '3px 0' }}><GradeBadge grade={e.grade} /><span className="ellipsis">{e.name}</span></div>)}
    </div>
  );
}

function generalInsight(p: { kcal: number; target: number; date: string; mealMode: boolean; mealsLogged: number; protein: number; proteinTarget: number }) {
  const r = p.target ? p.kcal / p.target : 0;
  const isToday = p.date === todayKey();
  const hour = new Date().getHours();
  if (p.mealMode) {
    if (r > 1.25) return { title: 'Comida abundante', text: 'Esta comida supera bastante lo previsto. Compénsalo con algo más ligero en la siguiente, sin saltártela.' };
    if (r < 0.6) return { title: 'Comida ligera', text: 'Ha quedado por debajo de lo previsto. Si te quedas con hambre, añade algo de proteína o fruta.' };
    return { title: 'Bien ajustada', text: 'Esta comida encaja con el reparto que tienes previsto para el día.' };
  }
  if (isToday && r < 0.6 && hour < 21) {
    return { title: 'Un buen comienzo de día', text: 'La ingesta registrada queda por debajo del 60% de tu objetivo, así que quizá el día aún no esté completo. Cuando puedas, añade las comidas que falten para tener una visión completa.' };
  }
  if (r < 0.6) return { title: 'Día incompleto', text: 'Has registrado bastante menos de tu objetivo. Si se te olvidó apuntar algo, aún puedes añadirlo: comer muy por debajo de forma continuada tampoco ayuda.' };
  if (r > 1.1) return { title: 'Algo por encima', text: `Has superado tu objetivo en ${fmt(p.kcal - p.target)} kcal. Un día no cambia nada: lo importante es la media de la semana.` };
  if (r >= 0.9) {
    const prot = p.protein >= p.proteinTarget * 0.9 ? ' y además con buena proteína' : '';
    return { title: '¡Día equilibrado!', text: `Estás dentro de tu objetivo calórico${prot}. Así se construyen los hábitos.` };
  }
  return { title: 'Vas por buen camino', text: 'Estás cerca de tu objetivo. Si tienes hambre, elige algo rico en proteína o fibra para cerrar el día.' };
}

function macroInsight(macroKcal: { key: MacroKey; kcal: number; label: string }[], total: number, split: { protein: number; carbs: number; fat: number }) {
  if (!total) return '';
  const diffs = (['protein', 'carbs', 'fat'] as const).map((k) => ({
    k, label: macroKcal.find((m) => m.key === k)!.label.toLowerCase(), diff: (macroKcal.find((m) => m.key === k)!.kcal / total) * 100 - split[k]
  }));
  const worst = diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
  if (Math.abs(worst.diff) < 7) return 'Tu reparto de macros encaja bien con tu objetivo. ¡Buen equilibrio!';
  return worst.diff > 0
    ? `La proporción de ${worst.label} destaca sobre tu objetivo (+${Math.round(worst.diff)} puntos). Podrías equilibrarla poco a poco en las próximas comidas.`
    : `Vas algo corto de ${worst.label} (${Math.round(worst.diff)} puntos respecto a tu objetivo).`;
}
