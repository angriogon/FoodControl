import { useState } from 'react';
import type { FoodEntry, MealId } from '../types';
import { actions, currentWeight, useAppState, useDay, useSelectedDate, useTargets } from '../store/store';
import { MEALS, burnedKcal, dayTotals, fmt, mealTotals } from '../lib/nutrition';
import { addDays, dayLabel, todayKey } from '../lib/dates';
import { useGameStatus } from '../lib/hooks';
import { Ring } from '../components/Ring';
import { GradeBadge, ProgressBar } from '../components/common';
import { Flame, Gem, IconArrowRight, IconCalendar, IconChevronLeft, IconChevronRight, IconPlus, IconSparkles } from '../components/Icons';
import { AddFoodSheet, FoodAmountSheet, QuickAddSheet, foodFromEntry } from './FoodSheets';
import { ActivitySheet } from './ActivitySheet';
import { AnalysisSheet } from './Analysis';
import { toast } from '../components/Toast';

export function Diary() {
  const [date, setDate] = useSelectedDate();
  const day = useDay(date);
  const targets = useTargets();
  const state = useAppState();
  const game = useGameStatus();
  const [addMeal, setAddMeal] = useState<MealId | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [analysis, setAnalysis] = useState<{ meal?: MealId } | null>(null);

  const totals = dayTotals(day);
  const burned = burnedKcal(day);
  const budget = targets.kcal + (state.profile.addExerciseKcal ? burned : 0);
  const remaining = budget - totals.kcal;
  const isFuture = date > todayKey();

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      {/* Cabecera resumen */}
      <div className="diary-hero" style={{ marginTop: 0 }}>
        <div className="row between">
          <span className="pill num"><Gem /> {fmt(game.balance)}</span>
          <span className="pill num" style={{ color: 'var(--flame)' }}><Flame /> {game.streak}</span>
        </div>
        <div className="row between" style={{ marginTop: 6, alignItems: 'center' }}>
          <div className="center" style={{ width: 90 }}>
            <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>{fmt(totals.kcal)}</div>
            <div className="small" style={{ opacity: 0.75 }}>Ingeridas</div>
          </div>
          <Ring value={Math.max(0, budget - Math.max(0, remaining))} max={budget} size={156} stroke={9} color="rgba(255,255,255,.95)" track="rgba(255,255,255,.35)">
            <span className="num" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1 }}>{fmt(Math.abs(remaining))}</span>
            <span style={{ fontSize: 20, fontWeight: 500 }}>kcal</span>
            <span className="small" style={{ opacity: 0.75 }}>{remaining >= 0 ? 'Restantes' : 'De más'}</span>
          </Ring>
          <div className="center" style={{ width: 90 }}>
            <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>{fmt(burned)}</div>
            <div className="small" style={{ opacity: 0.75 }}>Quemadas</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 14 }}>
          {([['Grasa', totals.fat, targets.fat], ['Proteínas', totals.protein, targets.protein], ['Carbohid.', totals.carbs, targets.carbs], ['Fibra', totals.fiber, targets.fiber]] as const).map(([l, v, t]) => (
            <div key={l} className="center">
              <ProgressBar value={v} max={t} color="#fff" track="rgba(255,255,255,.4)" />
              <div className="small" style={{ marginTop: 6, opacity: 0.8 }}>{l}</div>
              <div className="tiny num" style={{ opacity: 0.7 }}>{fmt(v)}/{fmt(t)} g</div>
            </div>
          ))}
        </div>
        <button className="btn block" style={{ marginTop: 18, background: '#23324A', color: '#fff' }} onClick={() => setAnalysis({})}>
          <IconSparkles size={20} /> Análisis del día
        </button>
      </div>

      <div className="diary-sheet">
        <DateNav date={date} setDate={setDate} />

        {isFuture && (
          <div className="banner small" style={{ marginTop: 14 }}>
            <span>🗓️</span>
            <span>Estás planificando un día futuro. Puedes dejar tus comidas preparadas.</span>
          </div>
        )}

        {MEALS.map((m) => {
          const entries = day.entries.filter((e) => e.meal === m.id);
          const t = mealTotals(day, m.id);
          return (
            <div key={m.id} className="meal-card">
              <div className="row">
                <div className="meal-avatar">{m.emoji}</div>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 20 }}>{m.label}</div>
                  <div className="muted num" style={{ fontWeight: 600 }}>
                    {fmt(t.kcal)} / {fmt(targets.meals[m.id])} kcal
                  </div>
                </div>
                <button className="icon-btn dark" style={{ width: 52, height: 52 }} onClick={() => setAddMeal(m.id)} aria-label={`Añadir a ${m.label}`}>
                  <IconPlus size={24} />
                </button>
              </div>
              {entries.length > 0 && (
                <>
                  <div className="list" style={{ marginTop: 8 }}>
                    {entries.map((e) => (
                      <button key={e.id} className="entry-row" onClick={() => setEditing(e)}>
                        <span className="entry-emoji">{e.emoji ?? '🍽️'}</span>
                        <span className="grow">
                          <span className="ellipsis" style={{ display: 'block' }}>{e.name}</span>
                          <span className="small muted">
                            {e.unit === 'kcal' ? 'Añadido rápido' : `${fmt(e.amount)} ${e.unit}`} · P {fmt(e.nutrients.protein)} · C {fmt(e.nutrients.carbs)} · G {fmt(e.nutrients.fat)}
                          </span>
                        </span>
                        <GradeBadge grade={e.grade} />
                        <span className="num" style={{ fontWeight: 600, minWidth: 44, textAlign: 'right' }}>{fmt(e.nutrients.kcal)}</span>
                      </button>
                    ))}
                  </div>
                  <button className="analysis-link" onClick={() => setAnalysis({ meal: m.id })}>
                    <IconSparkles size={22} />
                    <span className="grow">Ver el análisis de esta comida</span>
                    <IconArrowRight size={22} />
                  </button>
                </>
              )}
            </div>
          );
        })}

        <ActivitiesCard date={date} onAdd={() => setActivityOpen(true)} />
        <WaterCard date={date} />
        <NoteCard date={date} />
      </div>

      <AddFoodSheet open={addMeal !== null} onClose={() => setAddMeal(null)} date={date} meal={addMeal ?? 'desayuno'} />
      <FoodAmountSheet
        food={editing && editing.unit !== 'kcal' ? foodFromEntry(editing) : null}
        entry={editing ?? undefined}
        meal={editing?.meal ?? 'desayuno'}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          actions.updateEntry(date, e);
          setEditing(null);
          toast('Cambios guardados', '✅');
        }}
        onDelete={() => {
          actions.removeEntry(date, editing!.id);
          setEditing(null);
          toast('Alimento eliminado', '🗑️');
        }}
      />
      <QuickAddSheet
        open={!!editing && editing.unit === 'kcal'}
        entry={editing ?? undefined}
        meal={editing?.meal ?? 'desayuno'}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          actions.updateEntry(date, e);
          setEditing(null);
        }}
        onDelete={() => {
          actions.removeEntry(date, editing!.id);
          setEditing(null);
          toast('Eliminado', '🗑️');
        }}
      />
      <ActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} date={date} weightKg={currentWeight(state)} />
      <AnalysisSheet open={!!analysis} meal={analysis?.meal} date={date} onClose={() => setAnalysis(null)} />
    </div>
  );
}

export function DateNav({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  return (
    <div className="date-nav">
      <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
        <IconChevronLeft size={20} />
      </button>
      <div className="date-btn">
        <IconCalendar size={24} />
        <span className="ellipsis">{dayLabel(date)}</span>
        {/* El input nativo abre el selector de fecha de iOS */}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Elegir fecha" />
      </div>
      <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
        <IconChevronRight size={20} />
      </button>
    </div>
  );
}

function ActivitiesCard({ date, onAdd }: { date: string; onAdd: () => void }) {
  const day = useDay(date);
  const burned = burnedKcal(day);
  return (
    <div className="card flat" style={{ marginTop: 18 }}>
      <div className="row">
        <div className="meal-avatar" style={{ background: 'var(--card)' }}>🏆</div>
        <div className="grow" style={{ fontWeight: 600, fontSize: 19 }}>Actividades</div>
        <div className="muted num">{fmt(burned)} kcal</div>
      </div>
      {day.activities.length > 0 && (
        <div className="list" style={{ marginTop: 8 }}>
          {day.activities.map((a) => (
            <div key={a.id} className="entry-row">
              <span className="entry-emoji" style={{ background: 'var(--card)' }}>{a.emoji ?? '🏃'}</span>
              <span className="grow">
                <span className="ellipsis" style={{ display: 'block' }}>{a.name}</span>
                <span className="small muted">{a.minutes ? `${a.minutes} min · ` : ''}{a.kcal} kcal</span>
              </span>
              <button
                className="link small"
                onClick={() => {
                  actions.removeActivity(date, a.id);
                  toast('Actividad eliminada', '🗑️');
                }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="center" style={{ marginTop: 14 }}>
        <button className="btn" onClick={onAdd}>Añadir una actividad</button>
      </div>
    </div>
  );
}

function WaterCard({ date }: { date: string }) {
  const day = useDay(date);
  const { profile } = useAppState();
  const glass = profile.glassMl;
  const count = Math.max(1, Math.ceil(profile.waterGoalMl / glass));
  const full = Math.floor(day.waterMl / glass);
  const done = day.waterMl >= profile.waterGoalMl;

  const tap = (i: number) => {
    const next = i < full ? i * glass : (i + 1) * glass;
    actions.setWater(date, next);
    if (next >= profile.waterGoalMl && day.waterMl < profile.waterGoalMl) toast('¡Objetivo de agua cumplido!', '💧');
  };

  return (
    <div className="card outline" style={{ marginTop: 16 }}>
      <div className="row between">
        <div>
          <div style={{ fontWeight: 600, fontSize: 19 }}>Agua {done && '✅'}</div>
          <div className="muted small">Objetivo: {fmt(profile.waterGoalMl / 1000, 2)} l · vaso de {glass} ml</div>
        </div>
        <div className="num" style={{ fontWeight: 600, fontSize: 20 }}>{fmt(day.waterMl / 1000, 2)} l</div>
      </div>
      <div className="water-grid" style={{ gridTemplateColumns: `repeat(${Math.min(count, 8)}, 1fr)` }}>
        {Array.from({ length: Math.max(count, full + (full >= count ? 1 : 0)) }, (_, i) => (
          <button key={i} className={`glass${i < full ? ' full' : ''}`} onClick={() => tap(i)} aria-label={`Vaso ${i + 1}`}>
            {i < full ? '💧' : '+'}
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteCard({ date }: { date: string }) {
  const day = useDay(date);
  const [editing, setEditing] = useState(false);
  return (
    <div className="card outline" style={{ marginTop: 16 }}>
      <div className="row">
        <div className="meal-avatar" style={{ background: 'var(--fat-bg)' }}>✏️</div>
        <div className="grow" style={{ fontWeight: 600, fontSize: 19 }}>Notas</div>
      </div>
      {editing ? (
        <textarea
          className="input"
          style={{ marginTop: 12 }}
          autoFocus
          value={day.note}
          placeholder="¿Cómo te has sentido hoy? ¿Hambre, energía, sueño…?"
          onChange={(e) => actions.setNote(date, e.target.value)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button className="muted" style={{ marginTop: 12, textAlign: 'left', width: '100%', whiteSpace: 'pre-wrap' }} onClick={() => setEditing(true)}>
          {day.note || 'Añade una nota y describe tu día aquí en detalle.'}
        </button>
      )}
      {!editing && (
        <div className="center" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => setEditing(true)}>{day.note ? 'Editar nota' : 'Añadir nota'}</button>
        </div>
      )}
    </div>
  );
}
