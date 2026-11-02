import { useMemo, useState } from 'react';
import { IconGear, IconPencil } from '../components/Icons';
import { useAppState, useTargets, currentWeight } from '../store/store';
import { addDays, shortDate, todayKey, weekdayLetter, diffDays } from '../lib/dates';
import { dayQuality, dayTotals, fmt, qualityLabel } from '../lib/nutrition';
import { WeightSheet } from './WeightSheet';
import { SettingsSheet } from './Settings';

const GOAL_LABEL = { perder: 'Bajar de peso', mantener: 'Mantener peso', ganar: 'Ganar peso' };
type Range = 7 | 30 | 180 | 0;

export function Profile({ dataOpen, setDataOpen }: { dataOpen: boolean; setDataOpen: (v: boolean) => void }) {
  const state = useAppState();
  const targets = useTargets();
  const [tab, setTab] = useState<'peso' | 'nutricion'>('peso');
  const [weightOpen, setWeightOpen] = useState(false);
  const [settings, setSettings] = useState<'perfil' | null>(null);
  const { profile } = state;
  const initial = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div className="profile-hero">
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="avatar">{initial}</div>
          <div className="grow" style={{ paddingTop: 8 }}>
            <button className="row" style={{ gap: 6, fontSize: 24, fontWeight: 500 }} onClick={() => setSettings('perfil')}>
              {profile.name || 'Tu perfil'} <IconPencil size={18} />
            </button>
            <div style={{ opacity: 0.7, fontSize: 18 }}>{GOAL_LABEL[profile.goal]}</div>
            <span className="pill num" style={{ marginTop: 10, fontSize: 20, fontWeight: 600, padding: '8px 18px' }}>{fmt(targets.kcal)} kcal / d</span>
          </div>
          <button className="icon-btn" style={{ background: 'rgba(255,255,255,.6)' }} onClick={() => setSettings('perfil')} aria-label="Ajustes">
            <IconGear size={24} />
          </button>
        </div>
        <div className="tabs-underline">
          <button className={tab === 'peso' ? 'active' : ''} onClick={() => setTab('peso')}>Peso</button>
          <button className={tab === 'nutricion' ? 'active' : ''} onClick={() => setTab('nutricion')}>Nutrición</button>
        </div>
      </div>

      {tab === 'peso' ? <WeightTab onAdd={() => setWeightOpen(true)} /> : <NutritionTab />}

      <div className="card list" style={{ marginTop: 24, paddingTop: 4, paddingBottom: 4 }}>
        <button className="settings-row" onClick={() => setSettings('perfil')}>
          <span className="settings-icon">🎯</span><span className="grow">Objetivos, macros y agua</span><span className="faint">›</span>
        </button>
        <button className="settings-row" onClick={() => setDataOpen(true)}>
          <span className="settings-icon">☁️</span><span className="grow">Datos y copia de seguridad</span><span className="faint">›</span>
        </button>
      </div>
      <p className="center tiny faint" style={{ marginTop: 18 }}>FoodControl · tus datos se guardan solo en este dispositivo</p>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <SettingsSheet open={settings === 'perfil'} onClose={() => setSettings(null)} section="perfil" />
      <SettingsSheet open={dataOpen} onClose={() => setDataOpen(false)} section="datos" />
    </div>
  );
}

function WeightTab({ onAdd }: { onAdd: () => void }) {
  const state = useAppState();
  const [range, setRange] = useState<Range>(30);
  const { profile, weights } = state;
  const current = currentWeight(state);
  const lost = profile.startWeightKg - current;
  const bmi = current / (profile.heightCm / 100) ** 2;
  const toGo = current - profile.goalWeightKg;

  const points = useMemo(() => {
    const from = range ? addDays(todayKey(), -range) : '0000';
    return weights.filter((w) => w.date >= from);
  }, [weights, range]);

  return (
    <>
      <div className="stat-trio">
        <div><b>{fmt(profile.startWeightKg, 1)} kg</b><div className="small muted">Peso inicial</div></div>
        <div><b>{fmt(current, 1)} kg</b><div className="small muted">Peso actual</div></div>
        <div><b>{fmt(profile.goalWeightKg, 1)} kg</b><div className="small muted">Objetivo</div></div>
      </div>
      <button className="btn block" onClick={onAdd}>Añadir un peso</button>

      <div className="segmented" style={{ marginTop: 22 }}>
        {([[7, '7 días'], [30, '1 mes'], [180, '6 meses'], [0, 'Todo']] as [Range, string][]).map(([r, l]) => (
          <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{l}</button>
        ))}
      </div>

      {Math.abs(lost) >= 0.1 && (
        <p className="center" style={{ fontWeight: 600, fontSize: 18, color: lost > 0 === (profile.goal !== 'ganar') ? 'var(--good)' : 'var(--warn)' }}>
          Has {lost > 0 ? 'perdido' : 'ganado'} {fmt(Math.abs(lost), 1)} kg desde el inicio
        </p>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        {points.length >= 2 ? (
          <WeightChart points={points} goal={profile.goalWeightKg} />
        ) : (
          <p className="center muted" style={{ padding: '24px 0' }}>
            {points.length ? 'Registra al menos dos pesos para ver la gráfica.' : 'No hay registros en este periodo.'}
          </p>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card center" style={{ marginTop: 0 }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{fmt(bmi, 1)}</div>
          <div className="small muted">IMC · {bmiLabel(bmi)}</div>
        </div>
        <div className="card center" style={{ marginTop: 0 }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{fmt(Math.abs(toGo), 1)} kg</div>
          <div className="small muted">{Math.abs(toGo) < 0.1 ? '¡Objetivo logrado!' : 'para tu objetivo'}</div>
        </div>
      </div>
      <p className="tiny faint">El IMC es orientativo: no distingue entre masa muscular y grasa.</p>
    </>
  );
}

function bmiLabel(b: number): string {
  if (b < 18.5) return 'bajo peso';
  if (b < 25) return 'normal';
  if (b < 30) return 'sobrepeso';
  return 'obesidad';
}

function WeightChart({ points, goal }: { points: { date: string; kg: number }[]; goal: number }) {
  const W = 320;
  const H = 180;
  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const kgs = points.map((p) => p.kg);
  let min = Math.min(...kgs, goal);
  let max = Math.max(...kgs, goal);
  const span = Math.max(2, max - min);
  min = Math.floor(min - span * 0.1);
  max = Math.ceil(max + span * 0.1);
  const d0 = points[0].date;
  const days = Math.max(1, diffDays(points[points.length - 1].date, d0));
  const x = (d: string) => pad.l + (diffDays(d, d0) / days) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + ((max - kg) / (max - min)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points[points.length - 1].date)} ${H - pad.b} L${x(d0)} ${H - pad.b} Z`;
  const ticks = [max, (max + min) / 2, min];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolución del peso">
      <defs>
        <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2BB39B" stopOpacity=".25" />
          <stop offset="1" stopColor="#2BB39B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--text-3)">{fmt(t)}</text>
        </g>
      ))}
      {goal >= min && goal <= max && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--good)" strokeDasharray="4 4" />
          <text x={W - pad.r} y={y(goal) - 4} fontSize="10" textAnchor="end" fill="var(--good)">Objetivo</text>
        </g>
      )}
      <path d={area} fill="url(#wfill)" />
      <path d={path} fill="none" stroke="#2BB39B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={points.length > 40 ? 0 : 3.5} fill="var(--card)" stroke="#2BB39B" strokeWidth="2" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="11" fill="var(--text-3)">{shortDate(d0)}</text>
      <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--text-3)">{shortDate(points[points.length - 1].date)}</text>
    </svg>
  );
}

function NutritionTab() {
  const state = useAppState();
  const targets = useTargets();
  const today = todayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const data = week.map((d) => ({ d, t: dayTotals(state.days[d]), q: dayQuality(state.days[d]?.entries ?? []) }));
  const logged = data.filter((x) => x.t.kcal > 0);
  const avg = (f: (x: (typeof data)[number]) => number) => (logged.length ? logged.reduce((s, x) => s + f(x), 0) / logged.length : 0);
  const maxK = Math.max(targets.kcal * 1.3, ...data.map((x) => x.t.kcal));
  const qs = logged.map((x) => x.q).filter((q): q is number => q != null);
  const avgQ = qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;

  return (
    <>
      <h2 className="section-title" style={{ marginTop: 22 }}>Últimos 7 días</h2>
      <div className="card">
        <div className="row between small muted"><span>kcal diarias</span><span>Objetivo {fmt(targets.kcal)}</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, marginTop: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(targets.kcal / maxK) * 100}%`, borderTop: '2px dashed var(--good)', opacity: 0.6 }} />
          {data.map(({ d, t }) => {
            const over = t.kcal > targets.kcal * 1.1;
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: 30, height: `${(t.kcal / maxK) * 100}%`, minHeight: t.kcal ? 4 : 0, borderRadius: 8, background: over ? 'var(--warn)' : d === today ? 'var(--accent-strong)' : 'var(--carbs)' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {data.map(({ d }) => <div key={d} className="tiny muted center" style={{ flex: 1, fontWeight: d === today ? 700 : 400 }}>{weekdayLetter(d)}</div>)}
        </div>
      </div>

      <div className="card">
        <b>Medias de los días registrados ({logged.length})</b>
        {[
          ['Calorías', avg((x) => x.t.kcal), targets.kcal, 'kcal'],
          ['Proteínas', avg((x) => x.t.protein), targets.protein, 'g'],
          ['Carbohidratos', avg((x) => x.t.carbs), targets.carbs, 'g'],
          ['Grasa', avg((x) => x.t.fat), targets.fat, 'g'],
          ['Fibra', avg((x) => x.t.fiber), targets.fiber, 'g']
        ].map(([l, v, t, u]) => (
          <div key={l as string} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{l}</span>
            <span className="num"><b>{fmt(v as number)}</b> <span className="faint">/ {fmt(t as number)} {u}</span></span>
          </div>
        ))}
        <div className="row between" style={{ paddingTop: 10 }}>
          <span>Calidad media</span>
          <b>{qualityLabel(avgQ).label}{avgQ != null ? ` (${avgQ}/100)` : ''}</b>
        </div>
      </div>
    </>
  );
}
