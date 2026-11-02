import { useMemo, useState } from 'react';
import { Cell, Segmented } from '../components/common';
import { useAppState, useTargets, currentWeight } from '../store/store';
import { addDays, shortDate, todayKey, weekdayLetter, diffDays } from '../lib/dates';
import { dayQuality, dayTotals, fmt, qualityLabel } from '../lib/nutrition';
import { WeightSheet } from './WeightSheet';
import { trendSeries, weightInsight, type TrendPoint } from '../lib/trend';
import { SettingsSheet } from './Settings';
import { AdaptiveSheet } from './Adaptive';

const GOAL_LABEL = { perder: 'Bajar de peso', mantener: 'Mantener peso', ganar: 'Ganar peso' };
type Range = 30 | 90 | 180 | 0;
const TEXT_LABEL = { auto: 'Como en iOS', m: 'Normal', l: 'Grande', xl: 'Muy grande' };
const THEME_LABEL = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

export function Profile({ dataOpen, setDataOpen }: { dataOpen: boolean; setDataOpen: (v: boolean) => void }) {
  const state = useAppState();
  const targets = useTargets();
  const [tab, setTab] = useState<'peso' | 'nutricion'>('peso');
  const [weightOpen, setWeightOpen] = useState(false);
  const [adaptiveOpen, setAdaptiveOpen] = useState(false);
  const [settings, setSettings] = useState<'perfil' | 'accesibilidad' | null>(null);
  const { profile, ui } = state;
  const initial = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{GOAL_LABEL[profile.goal]}</div>
          <h1 className="large-title">Perfil</h1>
        </div>
      </header>

      <button className="card row" style={{ width: '100%' }} onClick={() => setSettings('perfil')} aria-label={`${profile.name || 'Tu perfil'}. Objetivo ${fmt(targets.kcal)} kilocalorías al día. Editar`}>
        <span className="avatar" aria-hidden="true">{initial}</span>
        <span className="grow">
          <span className="bold" style={{ display: 'block', fontSize: '1.2rem' }}>{profile.name || 'Tu perfil'}</span>
          <span className="small muted">Objetivo: {fmt(targets.kcal)} kcal/día</span>
        </span>
        <span className="link small">Editar</span>
      </button>

      <div className="mt">
        <Segmented label="Sección" value={tab} onChange={setTab} options={[{ value: 'peso', label: 'Peso' }, { value: 'nutricion', label: 'Nutrición' }]} />
      </div>

      {tab === 'peso' ? <WeightTab onAdd={() => setWeightOpen(true)} /> : <NutritionTab />}

      <h2 className="section-header">Ajustes</h2>
      <div className="group inset-icons">
        <Cell icon={<span className="icon-tile" style={{ background: '#34c759' }}>🎯</span>} title="Objetivos, macros y agua" onClick={() => setSettings('perfil')} />
        <Cell icon={<span className="icon-tile" style={{ background: '#ff9500' }}>🧪</span>} title="Objetivo adaptativo"
          sub={state.profile.kcalOverride ? 'En pausa (objetivo manual)' : !state.adaptive.enabled ? 'Desactivado' : state.adaptive.tdee != null ? `Gasto real estimado: ${fmt(state.adaptive.tdee)} kcal` : 'Calibrando con tus datos'}
          onClick={() => setAdaptiveOpen(true)} />
        <Cell icon={<span className="icon-tile" style={{ background: '#0062cc' }} aria-hidden="true">Aa</span>} title="Accesibilidad y apariencia"
          sub={`Texto: ${TEXT_LABEL[ui.textSize]} · Tema: ${THEME_LABEL[ui.theme]}`} onClick={() => setSettings('accesibilidad')} />
        <Cell icon={<span className="icon-tile" style={{ background: '#5ac8fa' }}>☁️</span>} title="Datos y copia de seguridad" onClick={() => setDataOpen(true)} />
      </div>
      <p className="section-footer center">FoodControl · tus datos se guardan solo en este dispositivo</p>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <AdaptiveSheet open={adaptiveOpen} onClose={() => setAdaptiveOpen(false)} />
      <SettingsSheet open={settings === 'perfil'} onClose={() => setSettings(null)} section="perfil" />
      <SettingsSheet open={settings === 'accesibilidad'} onClose={() => setSettings(null)} section="accesibilidad" />
      <SettingsSheet open={dataOpen} onClose={() => setDataOpen(false)} section="datos" />
    </div>
  );
}

function WeightTab({ onAdd }: { onAdd: () => void }) {
  const state = useAppState();
  const [range, setRange] = useState<Range>(0);
  const { profile, weights } = state;
  const today = todayKey();
  const insight = useMemo(() => weightInsight(weights, profile.goalWeightKg, today), [weights, profile.goalWeightKg, today]);
  const current = insight.trendKg ?? currentWeight(state);
  const lost = profile.startWeightKg - current;
  const bmi = current / (profile.heightCm / 100) ** 2;
  const toGo = current - profile.goalWeightKg;
  const goingRight = (r: number) => (profile.goal === 'ganar' ? r > 0 : profile.goal === 'perder' ? r < 0 : Math.abs(r) < 0.15);

  const series = useMemo(() => {
    const from = range ? addDays(today, -range) : '0000';
    return trendSeries(weights).filter((p) => p.date >= from);
  }, [weights, range, today]);

  return (
    <>
      <div className="card mt">
        <div className="stat-trio">
          <div><div className="stat-value">{fmt(profile.startWeightKg, 1)}</div><div className="tiny muted">Inicial (kg)</div></div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent-text)' }}>{fmt(current, 1)}</div>
            <div className="tiny muted">{insight.trendKg != null && weights.length >= 3 ? 'Tendencia (kg)' : 'Actual (kg)'}</div>
          </div>
          <div><div className="stat-value">{fmt(profile.goalWeightKg, 1)}</div><div className="tiny muted">Objetivo (kg)</div></div>
        </div>
        {Math.abs(lost) >= 0.1 && (
          <p className="center small bold" style={{ marginTop: '0.8rem', color: lost > 0 === (profile.goal !== 'ganar') ? 'var(--good)' : 'var(--warn)' }}>
            Has {lost > 0 ? 'perdido' : 'ganado'} {fmt(Math.abs(lost), 1)} kg desde el inicio
          </p>
        )}
      </div>

      {weights.length >= 3 && (
        <div className="group mt">
          <div className="cell">
            <span className="icon-tile" style={{ background: '#34c759' }} aria-hidden="true">📉</span>
            <span className="grow">
              <span className="cell-title">Ritmo real</span>
              <span className="cell-sub">
                {insight.ratePerWeek == null
                  ? 'Necesita pesajes que cubran al menos 2 semanas'
                  : `${insight.ratePerWeek > 0 ? '+' : ''}${fmt(insight.ratePerWeek, 2)} kg/semana (últimas 5 semanas)`}
              </span>
            </span>
            {insight.ratePerWeek != null && <span aria-hidden="true">{goingRight(insight.ratePerWeek) ? '✅' : '⚠️'}</span>}
          </div>
          {insight.projection && (
            <div className="cell">
              <span className="icon-tile" style={{ background: '#007aff' }} aria-hidden="true">🏁</span>
              <span className="grow">
                <span className="cell-title">Llegarías a {fmt(profile.goalWeightKg, 1)} kg hacia {monthYear(insight.projection)}</span>
                <span className="cell-sub">Proyección orientativa si mantienes este ritmo</span>
              </span>
            </div>
          )}
          {insight.lastVsTrend != null && Math.abs(insight.lastVsTrend) >= 0.5 && (
            <div className="cell">
              <span className="icon-tile" style={{ background: '#5ac8fa' }} aria-hidden="true">💧</span>
              <span className="grow">
                <span className="cell-title">Último pesaje {insight.lastVsTrend > 0 ? '+' : ''}{fmt(insight.lastVsTrend, 1)} kg sobre tu tendencia</span>
                <span className="cell-sub">
                  {insight.lastVsTrend > 0
                    ? 'Suele ser agua (sal, comida tardía, entreno). Fíjate en la tendencia, no en el número del día.'
                    : 'Bajada puntual: suele deberse a líquidos. La tendencia confirmará si se mantiene.'}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      <button className="btn block mt" onClick={onAdd}>Añadir peso</button>

      <h2 className="section-title">Evolución</h2>
      <Segmented label="Periodo" value={range} onChange={setRange}
        options={([[30, '1 mes'], [90, '3 meses'], [180, '6 meses'], [0, 'Todo']] as [Range, string][]).map(([v, l]) => ({ value: v, label: l }))} />

      <div className="card mt">
        {series.length >= 2 ? (
          <>
            <WeightChart points={series} goal={profile.goalWeightKg} />
            <div className="row small muted" style={{ gap: '1rem', marginTop: '0.5rem', justifyContent: 'center' }} aria-hidden="true">
              <span className="row" style={{ gap: '0.35rem' }}><span style={{ width: 10, height: 10, borderRadius: 99, border: '2px solid #2BB39B' }} /> Pesaje</span>
              <span className="row" style={{ gap: '0.35rem' }}><span style={{ width: 16, height: 3, borderRadius: 99, background: '#2BB39B' }} /> Tendencia</span>
            </div>
          </>
        ) : (
          <p className="center muted small" style={{ padding: '1.4rem 0' }}>
            {series.length ? 'Registra al menos dos pesos para ver la gráfica.' : 'No hay registros en este periodo.'}
          </p>
        )}
      </div>

      <div className="grid-2 mt">
        <div className="card center">
          <div className="stat-value">{fmt(bmi, 1)}</div>
          <div className="tiny muted">IMC · {bmiLabel(bmi)}</div>
        </div>
        <div className="card center" style={{ marginTop: 0 }}>
          <div className="stat-value">{fmt(Math.abs(toGo), 1)} kg</div>
          <div className="tiny muted">{Math.abs(toGo) < 0.1 ? '¡Objetivo logrado!' : 'para tu objetivo'}</div>
        </div>
      </div>
      <p className="section-footer">El IMC es orientativo: no distingue entre masa muscular y grasa.</p>
    </>
  );
}

const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
function monthYear(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return fmtMonth.format(new Date(y, m - 1, d));
}

function bmiLabel(b: number): string {
  if (b < 18.5) return 'bajo peso';
  if (b < 25) return 'normal';
  if (b < 30) return 'sobrepeso';
  return 'obesidad';
}

function WeightChart({ points, goal }: { points: TrendPoint[]; goal: number }) {
  const W = 320;
  const H = 180;
  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const vals = points.flatMap((p) => [p.kg, p.trend]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  // El objetivo solo se dibuja si está cerca: si no, aplastaría la curva
  const showGoal = goal >= min - 3 && goal <= max + 3;
  if (showGoal) {
    min = Math.min(min, goal);
    max = Math.max(max, goal);
  }
  const span = Math.max(2, max - min);
  min = Math.floor(min - span * 0.1);
  max = Math.ceil(max + span * 0.1);
  const d0 = points[0].date;
  const days = Math.max(1, diffDays(points[points.length - 1].date, d0));
  const x = (d: string) => pad.l + (diffDays(d, d0) / days) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + ((max - kg) / (max - min)) * (H - pad.t - pad.b);
  const trendPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.trend).toFixed(1)}`).join(' ');
  const area = `${trendPath} L${x(points[points.length - 1].date)} ${H - pad.b} L${x(d0)} ${H - pad.b} Z`;
  const ticks = [max, (max + min) / 2, min];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Evolución del peso del ${shortDate(first.date)} al ${shortDate(last.date)}: tendencia de ${fmt(first.trend, 1)} a ${fmt(last.trend, 1)} kilos`}>
      <defs>
        <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2BB39B" stopOpacity=".22" />
          <stop offset="1" stopColor="#2BB39B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--sep)" />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--text-3)">{fmt(t)}</text>
        </g>
      ))}
      {showGoal && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--good)" strokeDasharray="4 4" />
          <text x={W - pad.r} y={y(goal) - 4} fontSize="10" textAnchor="end" fill="var(--good)">Objetivo</text>
        </g>
      )}
      <path d={area} fill="url(#wfill)" />
      <path d={trendPath} fill="none" stroke="#2BB39B" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={points.length > 60 ? 2 : 3.5} fill="var(--card)" stroke="#2BB39B" strokeWidth="2" opacity=".85" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="11" fill="var(--text-3)">{shortDate(d0)}</text>
      <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--text-3)">{shortDate(last.date)}</text>
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
      <h2 className="section-title">Últimos 7 días</h2>
      <div className="card">
        <div className="row between small muted"><span>kcal diarias</span><span>Objetivo {fmt(targets.kcal)}</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '9rem', marginTop: '0.8rem', position: 'relative' }} aria-hidden="true">
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(targets.kcal / maxK) * 100}%`, borderTop: '2px dashed var(--good)', opacity: 0.6 }} />
          {data.map(({ d, t }) => {
            const over = t.kcal > targets.kcal * 1.1;
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: '1.8rem', height: `${(t.kcal / maxK) * 100}%`, minHeight: t.kcal ? 4 : 0, borderRadius: '0.4rem', background: over ? 'var(--warn)' : d === today ? 'var(--kcal)' : 'var(--carbs)' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }} aria-hidden="true">
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
          <div key={l as string} className="row between" style={{ padding: '0.5rem 0', borderBottom: '0.5px solid var(--sep)' }}>
            <span>{l}</span>
            <span className="num"><b>{fmt(v as number)}</b> <span className="faint">/ {fmt(t as number)} {u}</span></span>
          </div>
        ))}
        <div className="row between" style={{ paddingTop: '0.6rem' }}>
          <span>Calidad media</span>
          <b>{qualityLabel(avgQ).label}{avgQ != null ? ` (${avgQ}/100)` : ''}</b>
        </div>
      </div>
    </>
  );
}
