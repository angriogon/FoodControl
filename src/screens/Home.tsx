import { useMemo, useState } from 'react';
import type { MealId } from '../types';
import { actions, uid } from '../store/store';
import { toast } from '../components/Toast';
import { IconPlus } from '../components/Icons';
import { mealForNow, suggestionsFor } from '../lib/suggestions';
import { portionToEntry } from '../lib/recipes';
import { MEALS } from '../lib/nutrition';
import type { Tab } from '../components/TabBar';
import { Mascot } from '../components/Mascot';
import { Cell, MacroRings } from '../components/common';
import { Flame, Gem, IconCheck, IconChevronRight } from '../components/Icons';
import { useAppState, useDay, useTargets, setSelectedDate } from '../store/store';
import { useGameStatus } from '../lib/hooks';
import { dayTotals, fmt } from '../lib/nutrition';
import { diffDays, greeting, longDate, todayKey } from '../lib/dates';
import { isStandalone } from '../lib/storage';
import { AddFoodSheet } from './FoodSheets';
import { AnalysisSheet } from './Analysis';
import { AdaptiveCard, AdaptiveSheet } from './Adaptive';
import { WeightSheet } from './WeightSheet';
import { MyFoodsSheet } from './MyFoodsSheet';
import { SCENES } from '../lib/pet';

export function Home({ go, openData }: { go: (t: Tab) => void; openData: () => void }) {
  const state = useAppState();
  const today = todayKey();
  const day = useDay(today);
  const targets = useTargets();
  const game = useGameStatus();
  const [addMeal, setAddMeal] = useState<MealId | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [foodsOpen, setFoodsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [adaptiveOpen, setAdaptiveOpen] = useState(false);

  const totals = dayTotals(day);
  const nowMeal = mealForNow();
  const nowMealLabel = MEALS.find((m) => m.id === nowMeal)!.label;
  const suggestions = useMemo(() => suggestionsFor(state, nowMeal, today, 2), [state, nowMeal, today]);
  const has = (m: MealId) => day.entries.some((e) => e.meal === m);
  const lastWeight = state.weights[state.weights.length - 1];
  const weighedRecently = !!lastWeight && diffDays(today, lastWeight.date) < 7;
  const goDiary = () => {
    setSelectedDate(today);
    go('diario');
  };

  const tasks = [
    { id: 'desayuno', icon: '🥐', title: 'Registra tu desayuno', done: has('desayuno'), action: () => setAddMeal('desayuno') },
    { id: 'comida', icon: '🍲', title: 'Registra tu comida', done: has('comida'), action: () => setAddMeal('comida') },
    { id: 'cena', icon: '🥗', title: 'Registra tu cena', done: has('cena'), action: () => setAddMeal('cena') },
    { id: 'agua', icon: '💧', title: `Bebe ${fmt(targets.waterMl / 1000, 1)} l de agua`, sub: `${fmt(day.waterMl / 1000, 2)} l hasta ahora`, done: day.waterMl >= targets.waterMl, action: goDiary },
    { id: 'mover', icon: '👟', title: 'Muévete un poco', sub: 'Registra una actividad', done: day.activities.length > 0, action: goDiary },
    ...(!weighedRecently ? [{ id: 'peso', icon: '⚖️', title: 'Es hora de pesarte', sub: 'Una vez por semana es suficiente', done: false, action: () => setWeightOpen(true) }] : [])
  ];
  const doneCount = tasks.filter((t) => t.done).length;

  const daysSinceBackup = state.lastBackupAt ? diffDays(today, state.lastBackupAt.slice(0, 10)) : null;
  const needsBackup = Object.keys(state.days).length > 2 && (daysSinceBackup == null || daysSinceBackup >= 7);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const sky = SCENES[state.pet.equipped.scene] ?? SCENES.prado;

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{longDate(today)}</div>
          <h1 className="large-title">{greeting()}{state.profile.name ? `, ${state.profile.name}` : ''}</h1>
        </div>
      </header>

      {/* Tarjeta de la mascota */}
      <button
        className="pet-card"
        style={{ background: `linear-gradient(135deg, ${sky.sky[0]}, ${sky.sky[1]})`, color: sky.dark ? '#fff' : '#1c1c1e' }}
        onClick={() => go('mascota')}
        aria-label={`${state.pet.name}, nivel ${game.level}. ${petLine(state.pet.name, game.mood, doneCount, tasks.length)} Abrir mascota`}
      >
        <Mascot species={state.pet.species} equipped={{ ...state.pet.equipped, scene: 'prado' }} level={game.level} mood={game.mood} size="8.5rem" scene={false} />
        <span className="grow">
          <span className="bold" style={{ display: 'block', fontSize: '1.15rem' }}>{state.pet.name} · Nv. {game.level}</span>
          <span className="small" style={{ display: 'block', opacity: 0.75, marginTop: '0.2rem' }}>{petLine(state.pet.name, game.mood, doneCount, tasks.length)}</span>
          <span className="row" style={{ gap: '0.4rem', marginTop: '0.6rem' }}>
            <span className="pill num" style={{ background: 'rgba(255,255,255,.75)', color: '#1c1c1e' }}><Flame size={16} /> {game.streak}</span>
            <span className="pill num" style={{ background: 'rgba(255,255,255,.75)', color: '#1c1c1e' }}><Gem size={16} /> {fmt(game.balance)}</span>
          </span>
        </span>
        <IconChevronRight size={16} style={{ opacity: 0.5 }} />
      </button>

      {!isStandalone() && isIOS && (
        <div className="banner mt">
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📲</span>
          <div className="small">
            <b>Instálala en tu iPhone</b>
            <div className="muted">Pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>. Funciona a pantalla completa, sin conexión, y tus datos quedan protegidos.</div>
          </div>
        </div>
      )}

      {needsBackup && (
        <button className="banner info mt" onClick={openData}>
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">☁️</span>
          <div className="small grow">
            <b>Haz una copia de seguridad</b>
            <div className="muted">{daysSinceBackup == null ? 'Aún no has guardado ninguna copia.' : `Tu última copia es de hace ${daysAgo(daysSinceBackup)}.`} Guárdala en iCloud Drive en 2 toques.</div>
          </div>
          <IconChevronRight size={16} className="chevron" />
        </button>
      )}

      <AdaptiveCard onOpen={() => setAdaptiveOpen(true)} />

      {suggestions.length > 0 && (
        <section aria-label="Sugerencias">
          <h2 className="section-title">¿Lo de siempre?</h2>
          {suggestions.map((sg) => (
            <button key={sg.key} className="suggest" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => {
                const now = new Date().toISOString();
                const groupId = uid();
                const ids = actions.addEntries(today, sg.portions.map((p) => portionToEntry(p, nowMeal, 1, uid(), now, { groupId, groupName: sg.groupName })));
                if (sg.menuId) actions.markMenuUsed(sg.menuId);
                toast(`${sg.title} añadido a ${nowMealLabel}`, sg.emoji, undefined, { label: 'Deshacer', run: () => actions.removeEntries(today, ids) });
              }}
              aria-label={`Añadir ${sg.title} a ${nowMealLabel}: ${sg.subtitle}. ${sg.kcal} kilocalorías`}>
              <span style={{ fontSize: '1.4rem' }} aria-hidden="true">{sg.emoji}</span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{sg.title}</span>
                <span className="small muted ellipsis" style={{ display: 'block' }}>{sg.subtitle}</span>
              </span>
              <span className="num small bold">{sg.kcal} kcal</span>
              <span className="add-btn" aria-hidden="true"><IconPlus size={16} /></span>
            </button>
          ))}
          <p className="section-footer">Se añade a {nowMealLabel.toLowerCase()} de hoy. Puedes deshacerlo desde el aviso.</p>
        </section>
      )}

      <div className="row between" style={{ margin: '1.8rem 0 0.7rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Hoy</h2>
        <span className="small muted num" aria-label={`${doneCount} de ${tasks.length} tareas completadas`}>{doneCount} de {tasks.length}</span>
      </div>
      <div className="group inset-icons">
        {tasks.map((t) => (
          <Cell
            key={t.id}
            className={t.done ? 'done' : ''}
            icon={<span className="emoji-tile" aria-hidden="true">{t.icon}</span>}
            title={t.title}
            sub={t.sub}
            right={<span className={`task-check${t.done ? ' done' : ''}`} aria-hidden="true">{t.done && <IconCheck size={14} />}</span>}
            chevron={false}
            onClick={t.action}
            label={`${t.title}${t.sub ? `. ${t.sub}` : ''}. ${t.done ? 'Completada' : 'Pendiente'}`}
          />
        ))}
      </div>

      <h2 className="section-title">Mi objetivo</h2>
      <button className="card" style={{ width: '100%' }} onClick={() => setAnalysisOpen(true)} aria-label={`Hoy ${fmt(totals.kcal)} de ${fmt(targets.kcal)} kilocalorías. Ver análisis`}>
        <div className="row between" style={{ marginBottom: '1rem' }}>
          <span className="bold">Calorías</span>
          <span className="num"><b>{fmt(totals.kcal)}</b> <span className="muted">/ {fmt(targets.kcal)} kcal</span></span>
        </div>
        <MacroRings value={totals} target={targets} />
      </button>

      <h2 className="section-title">Más</h2>
      <div className="group inset-icons">
        <Cell
          icon={<span className="icon-tile" style={{ background: '#5ac8fa' }}>⚖️</span>}
          title="Mi peso"
          sub={lastWeight ? `${fmt(lastWeight.kg, 1)} kg · ${lastWeight.date === today ? 'hoy' : `hace ${daysAgo(diffDays(today, lastWeight.date))}`}` : 'Sin registros todavía'}
          onClick={() => setWeightOpen(true)}
        />
        <Cell
          icon={<span className="icon-tile" style={{ background: '#af52de' }}>📖</span>}
          title="Mi recetario"
          sub={`${state.menus.length} menús · ${state.recipes.length} platos propios`}
          onClick={() => go('recetas')}
        />
        <Cell
          icon={<span className="icon-tile" style={{ background: '#ff6482' }}>🥗</span>}
          title="Mis alimentos"
          sub={`${state.customFoods.length} propios · ${state.recentFoods.length} recientes`}
          onClick={() => setFoodsOpen(true)}
        />
        <Cell
          icon={<span className="icon-tile" style={{ background: '#ffb340' }}>🏆</span>}
          title="Mis logros"
          sub={`${Object.keys(state.achievements).length} desbloqueados`}
          onClick={() => go('logros')}
        />
        <Cell
          icon={<span className="icon-tile" style={{ background: '#34c759' }}>📈</span>}
          title="Mi progreso"
          sub="Peso y nutrición semanal"
          onClick={() => go('perfil')}
        />
        <Cell
          icon={<span className="icon-tile" style={{ background: '#007aff' }}>☁️</span>}
          title="Copia de seguridad"
          sub={daysSinceBackup == null ? 'Sin copias' : daysSinceBackup === 0 ? 'Hecha hoy' : `Hace ${daysAgo(daysSinceBackup)}`}
          onClick={openData}
        />
      </div>

      <AddFoodSheet open={addMeal !== null} onClose={() => setAddMeal(null)} date={today} meal={addMeal ?? 'desayuno'} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <MyFoodsSheet open={foodsOpen} onClose={() => setFoodsOpen(false)} />
      <AdaptiveSheet open={adaptiveOpen} onClose={() => setAdaptiveOpen(false)} />
      <AnalysisSheet open={analysisOpen} onClose={() => setAnalysisOpen(false)} date={today} />
    </div>
  );
}

function petLine(name: string, mood: string, done: number, total: number): string {
  if (mood === 'dormido') return `${name} está echando una siesta. ¡Despiértale registrando algo!`;
  if (done === total) return `¡${name} está orgulloso! Has completado todo hoy.`;
  if (mood === 'eufórico') return `¡${name} no cabe en sí de alegría!`;
  return `Llevas ${done} de ${total} tareas. ¡Sigue así!`;
}

/** “1 día”, “3 días” */
function daysAgo(n: number): string {
  return `${n} día${n === 1 ? '' : 's'}`;
}
