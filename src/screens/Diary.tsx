import { Fragment, useRef, useState } from 'react';
import type { FoodEntry, MealId, Portion } from '../types';
import { actions, currentWeight, useAppState, useDay, useSelectedDate, useTargets } from '../store/store';
import { MACROS, MEALS, burnedKcal, dayTotals, fmt, mealTotals } from '../lib/nutrition';
import { addDays, dayLabel, longDate, todayKey } from '../lib/dates';
import { useGameStatus } from '../lib/hooks';
import { Ring } from '../components/Ring';
import { Cell, GradeBadge, ProgressBar, Switch } from '../components/common';
import { Flame, Gem, IconBook, IconCalendar, IconChevronLeft, IconChevronRight, IconPlus, IconSparkles, IconTrash } from '../components/Icons';
import { AddFoodSheet, FoodAmountSheet, QuickAddSheet, foodFromEntry } from './FoodSheets';
import { ActivitySheet } from './ActivitySheet';
import { AnalysisSheet } from './Analysis';
import { MenuEditorSheet } from './RecipeSheets';
import { entryToPortion } from '../lib/recipes';
import { toast } from '../components/Toast';
import { SwipeRow } from '../components/SwipeRow';

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
  const [saveMenu, setSaveMenu] = useState<{ meal: MealId; items: Portion[] } | null>(null);
  // Comidas plegadas por defecto: solo se despliega la que toques
  const [openMeals, setOpenMeals] = useState<Set<MealId>>(new Set());

  const totals = dayTotals(day);
  const burned = burnedKcal(day);
  const budget = targets.kcal + (state.profile.addExerciseKcal ? burned : 0);
  const remaining = budget - totals.kcal;
  const isFuture = date > todayKey();

  /** Quita alimentos del día con opción de deshacer (vuelven a su sitio) */
  const removeWithUndo = (ids: string[], text: string) => {
    const set = new Set(ids);
    const removed = day.entries.map((entry, index) => ({ entry, index })).filter((r) => set.has(r.entry.id));
    if (!removed.length) return;
    actions.removeEntries(date, ids);
    toast(text, '🗑️', undefined, { label: 'Deshacer', run: () => actions.restoreEntries(date, removed) });
  };

  // Deslizar a izquierda/derecha cambia de día (fuera de hojas, campos y filas deslizables)
  const [anim, setAnim] = useState<'prev' | 'next' | null>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.sheet, .sheet-backdrop, .swipe-row, input, textarea, .chips, .segmented, .water-grid')) {
      swipe.current = null;
      return;
    }
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2.2 || Date.now() - s.t > 700) return;
    const dir = dx > 0 ? 'prev' : 'next';
    setAnim(dir);
    setDate(addDays(date, dir === 'prev' ? -1 : 1));
  };

  const toggleMeal = (m: MealId) =>
    setOpenMeals((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  return (
    <div className="screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="header">
        <div>
          <div className="eyebrow">{longDate(date)}</div>
          <h1 className="large-title">Diario</h1>
        </div>
        <div className="row" style={{ gap: '0.4rem' }}>
          <span className="pill num" aria-label={`${game.balance} gemas`}><Gem size={18} /> {fmt(game.balance)}</span>
          <span className="pill num" style={{ color: 'var(--flame)' }} aria-label={`Racha de ${game.streak} días`}><Flame size={18} /> {game.streak}</span>
        </div>
      </header>

      <DateNav date={date} setDate={(d) => { setAnim(d < date ? 'prev' : 'next'); setDate(d); }} anim={anim} />

      {/* Resumen del día */}
      <section className="card mt" aria-label="Resumen de calorías">
        <div className="summary">
          <Ring
            value={totals.kcal}
            max={budget}
            size="8.6rem"
            stroke={11}
            color={remaining < 0 ? 'var(--danger)' : 'var(--kcal)'}
            track="var(--card-2)"
            label={remaining >= 0 ? `Te quedan ${fmt(remaining)} kilocalorías de ${fmt(budget)}` : `Has superado tu objetivo en ${fmt(-remaining)} kilocalorías`}
          >
            <span className="num" style={{ fontSize: '1.9rem', fontWeight: 700, lineHeight: 1 }}>{fmt(Math.abs(remaining))}</span>
            <span className="tiny muted" style={{ marginTop: '0.2rem' }}>{remaining >= 0 ? 'kcal restantes' : 'kcal de más'}</span>
          </Ring>
          <div className="summary-side">
            <div>
              <div className="stat-label">Objetivo</div>
              <div className="stat-value">{fmt(targets.kcal)}</div>
            </div>
            <div>
              <div className="stat-label">Ingeridas</div>
              <div className="stat-value">{fmt(totals.kcal)}</div>
            </div>
            <div>
              <div className="stat-label">Quemadas</div>
              <div className="stat-value" style={{ color: 'var(--flame)' }}>{fmt(burned)}</div>
            </div>
          </div>
        </div>
        <div className="macro-grid">
          {MACROS.map((m) => (
            <div key={m.key}>
              <div className="row between small">
                <span className="bold">{m.key === 'carbs' ? 'Carbohid.' : m.label}</span>
                <span className="num muted">{fmt(totals[m.key])}/{fmt(targets[m.key])} g</span>
              </div>
              <ProgressBar value={totals[m.key]} max={targets[m.key]} color={m.color} track={`var(--${m.key}-bg)`} className="mt-s"
                label={`${m.label}: ${fmt(totals[m.key])} de ${fmt(targets[m.key])} gramos`} />
            </div>
          ))}
        </div>
      </section>

      <div className="group mt">
        <Cell
          icon={<span className="icon-tile" style={{ background: 'linear-gradient(135deg,#5ac8fa,#007aff)' }}><IconSparkles size={16} /></span>}
          title="Análisis del día"
          sub="Calidad, macros y recomendaciones"
          onClick={() => setAnalysis({})}
        />
      </div>

      {isFuture && (
        <div className="banner small mt">
          <span aria-hidden="true">🗓️</span>
          <span>Estás planificando un día futuro. Puedes dejar tus comidas preparadas.</span>
        </div>
      )}

      <h2 className="section-title">Comidas</h2>
      {MEALS.map((m) => {
        const entries = day.entries.filter((e) => e.meal === m.id);
        const t = mealTotals(day, m.id);
        const open = openMeals.has(m.id) && entries.length > 0;
        const summary = entries.map((e) => e.name).join(', ');
        const bodyId = `meal-${m.id}`;
        return (
          <section key={m.id} className="meal" data-open={open} aria-label={m.label}>
            <div className="meal-head">
              <button
                className="meal-toggle"
                onClick={() => (entries.length ? toggleMeal(m.id) : setAddMeal(m.id))}
                aria-expanded={entries.length ? open : undefined}
                aria-controls={entries.length ? bodyId : undefined}
              >
                <span className="meal-emoji" aria-hidden="true">{m.emoji}</span>
                <span className="grow">
                  <span className="row between" style={{ gap: '0.5rem' }}>
                    <span className="bold">{m.label}</span>
                    <span className="num small muted">{fmt(t.kcal)} / {fmt(targets.meals[m.id])} kcal</span>
                  </span>
                  <span className="small muted ellipsis" style={{ display: 'block', marginTop: '0.1rem' }}>
                    {entries.length ? `${entries.length} alimento${entries.length === 1 ? '' : 's'} · ${summary}` : 'Sin registrar'}
                  </span>
                  <ProgressBar value={t.kcal} max={targets.meals[m.id]} color={t.kcal > targets.meals[m.id] * 1.15 ? 'var(--warn)' : 'var(--kcal)'} className="meal-progress" />
                </span>
                {entries.length > 0 && <IconChevronRight size={16} className="meal-chevron" />}
              </button>
              <button className="add-btn" onClick={() => setAddMeal(m.id)} aria-label={`Añadir alimento a ${m.label}`}>
                <IconPlus size={18} />
              </button>
            </div>
            {open && (
              <div className="meal-body" id={bodyId}>
                {entries.map((e, idx) => (
                  <Fragment key={e.id}>
                  {e.groupId && e.groupId !== entries[idx - 1]?.groupId && (
                    <div className="group-label">
                      <span aria-hidden="true">📋</span>
                      <span className="grow ellipsis">{e.groupName ?? 'Menú'}</span>
                      <button className="link small" style={{ minHeight: '2rem', textTransform: 'none', letterSpacing: 0 }}
                        onClick={() => {
                          const group = entries.filter((x) => x.groupId === e.groupId);
                          removeWithUndo(group.map((x) => x.id), `${e.groupName ?? 'Menú'} quitado`);
                        }}
                        aria-label={`Quitar el menú ${e.groupName ?? ''} completo`}>
                        Quitar
                      </button>
                    </div>
                  )}
                  <SwipeRow onDelete={() => removeWithUndo([e.id], `${e.name} eliminado`)}>
                  <button className={`cell${e.groupId ? ' indent' : ''}`} onClick={() => setEditing(e)}
                    aria-label={`${e.name}, ${fmt(e.nutrients.kcal)} kilocalorías. Editar`}>
                    <span className="emoji-tile" aria-hidden="true">{e.emoji ?? '🍽️'}</span>
                    <span className="grow">
                      <span className="cell-title ellipsis">{e.name}</span>
                      <span className="cell-sub">
                        {e.unit === 'kcal' ? 'Solo calorías' : `${fmt(e.amount)} ${e.unit}`} · P {fmt(e.nutrients.protein)} · C {fmt(e.nutrients.carbs)} · G {fmt(e.nutrients.fat)}
                      </span>
                    </span>
                    <GradeBadge grade={e.grade} />
                    <span className="num bold" style={{ minWidth: '2.6rem', textAlign: 'right' }}>{fmt(e.nutrients.kcal)}</span>
                  </button>
                  </SwipeRow>
                  </Fragment>
                ))}
                <Cell
                  className="cell-sep"
                  icon={<IconBook size={18} color="var(--accent)" />}
                  title={<span style={{ color: 'var(--accent-text)' }}>Guardar como menú</span>}
                  sub="Para añadirlo entero de un toque otro día"
                  onClick={() => setSaveMenu({ meal: m.id, items: entries.map(entryToPortion) })}
                />
                <Cell
                  className="cell-sep"
                  icon={<IconSparkles size={18} color="var(--accent)" />}
                  title={<span style={{ color: 'var(--accent-text)' }}>Ver análisis de {m.label.toLowerCase()}</span>}
                  onClick={() => setAnalysis({ meal: m.id })}
                />
              </div>
            )}
          </section>
        );
      })}

      <ActivitiesCard date={date} onAdd={() => setActivityOpen(true)} />
      <WaterCard date={date} />
      <NoteCard date={date} />

      <AddFoodSheet open={addMeal !== null} onClose={() => setAddMeal(null)} date={date} meal={addMeal ?? 'desayuno'} />
      <FoodAmountSheet
        food={editing && editing.unit !== 'kcal' ? foodFromEntry(editing) : null}
        entry={editing ?? undefined}
        meal={editing?.meal ?? 'desayuno'}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          const prev = editing!;
          actions.updateEntry(date, e);
          setEditing(null);
          toast('Cambios guardados', '✅', undefined, { label: 'Deshacer', run: () => actions.updateEntry(date, prev) });
        }}
        onDelete={() => {
          removeWithUndo([editing!.id], 'Alimento eliminado');
          setEditing(null);
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
          removeWithUndo([editing!.id], 'Eliminado');
          setEditing(null);
        }}
      />
      <ActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} date={date} weightKg={currentWeight(state)} />
      <MenuEditorSheet
        open={!!saveMenu}
        initialItems={saveMenu?.items}
        initialMeal={saveMenu?.meal}
        initialName={saveMenu ? `Mi ${MEALS.find((x) => x.id === saveMenu.meal)!.label.toLowerCase()}` : ''}
        onClose={() => setSaveMenu(null)}
      />
      <AnalysisSheet open={!!analysis} meal={analysis?.meal} date={date} onClose={() => setAnalysis(null)} />
    </div>
  );
}

export function DateNav({ date, setDate, anim }: { date: string; setDate: (d: string) => void; anim?: 'prev' | 'next' | null }) {
  return (
    <div className="date-nav">
      <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
        <IconChevronLeft size={16} />
      </button>
      <label className="date-btn">
        <IconCalendar size={18} />
        <span key={date} className={`ellipsis${anim ? ` date-anim-${anim}` : ''}`}>{dayLabel(date)}</span>
        {/* El input nativo abre el selector de fecha de iOS */}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Elegir fecha" />
      </label>
      <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}

function ActivitiesCard({ date, onAdd }: { date: string; onAdd: () => void }) {
  const day = useDay(date);
  const burned = burnedKcal(day);
  return (
    <>
      <h2 className="section-title">Actividad</h2>
      <div className="group inset-icons">
        {day.activities.map((a) => (
          <div key={a.id} className="cell">
            <span className="emoji-tile" aria-hidden="true">{a.emoji ?? '🏃'}</span>
            <span className="grow">
              <span className="cell-title ellipsis">{a.name}</span>
              <span className="cell-sub">{a.minutes ? `${a.minutes} min · ` : ''}{a.kcal} kcal</span>
            </span>
            <button
              className="icon-btn"
              onClick={() => {
                actions.removeActivity(date, a.id);
                toast('Actividad eliminada', '🗑️', undefined, { label: 'Deshacer', run: () => actions.addActivity(date, a) });
              }}
              aria-label={`Eliminar ${a.name}`}
            >
              <IconTrash size={16} color="var(--danger)" />
            </button>
          </div>
        ))}
        <Cell
          icon={<span className="icon-tile" style={{ background: '#ff9500' }} aria-hidden="true">🏃</span>}
          title={<span style={{ color: 'var(--accent-text)' }}>Añadir actividad</span>}
          sub={burned ? `${fmt(burned)} kcal quemadas hoy` : 'Caminar, correr, gimnasio…'}
          onClick={onAdd}
        />
      </div>
    </>
  );
}

function WaterCard({ date }: { date: string }) {
  const day = useDay(date);
  const { profile } = useAppState();
  const glass = profile.glassMl;
  const count = Math.max(1, Math.ceil(profile.waterGoalMl / glass));
  const full = Math.floor(day.waterMl / glass);
  const done = day.waterMl >= profile.waterGoalMl;
  // Si se supera el objetivo se muestra un vaso más para seguir sumando
  const glasses = Math.max(count, full + (full >= count ? 1 : 0));

  const tap = (i: number) => {
    const next = i < full ? i * glass : (i + 1) * glass;
    actions.setWater(date, next);
    if (next >= profile.waterGoalMl && day.waterMl < profile.waterGoalMl) toast('¡Objetivo de agua cumplido!', '💧');
  };

  return (
    <>
      <h2 className="section-title">Agua</h2>
      <section className="card" aria-label="Agua">
        <div className="row between">
          <div>
            <div className="num" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {fmt(day.waterMl / 1000, 2)} <span className="muted" style={{ fontSize: '1rem', fontWeight: 500 }}>/ {fmt(profile.waterGoalMl / 1000, 2)} l</span>
            </div>
            <div className="small muted">{done ? '¡Objetivo cumplido! 💧' : `Vasos de ${glass} ml`}</div>
          </div>
          <div className="row" style={{ gap: '0.4rem' }}>
            <button className="icon-btn" onClick={() => actions.setWater(date, day.waterMl - glass)} aria-label="Quitar un vaso" disabled={!day.waterMl}>−</button>
            <button className="add-btn" onClick={() => tap(full)} aria-label="Añadir un vaso"><IconPlus size={18} /></button>
          </div>
        </div>
        <div className="water-grid" style={{ gridTemplateColumns: `repeat(${Math.min(glasses, 10)}, 1fr)` }} aria-hidden="true">
          {Array.from({ length: glasses }, (_, i) => (
            <button key={i} className={`glass${i < full ? ' full' : ''}`} onClick={() => tap(i)} tabIndex={-1}>
              {i < full ? '' : '+'}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function NoteCard({ date }: { date: string }) {
  const day = useDay(date);
  return (
    <>
      <div className="group mt">
        <div className="cell">
          <span className="grow">
            <span className="cell-title">No registré todo este día</span>
            <span className="cell-sub">No contará para calcular tu gasto real</span>
          </span>
          <Switch checked={!!day.incomplete} onChange={(v) => actions.setDayIncomplete(date, v)} label="No registré todo este día" />
        </div>
      </div>

      <h2 className="section-title">Notas</h2>
      <label className="sr-only" htmlFor={`note-${date}`}>Nota del día</label>
      <textarea
        id={`note-${date}`}
        className="input"
        value={day.note}
        placeholder="¿Cómo te has sentido hoy? Hambre, energía, sueño…"
        onChange={(e) => actions.setNote(date, e.target.value)}
      />
    </>
  );
}
