import { useState } from 'react';
import type { MealId } from '../types';
import type { Tab } from '../components/TabBar';
import { Mascot } from '../components/Mascot';
import { MacroRings } from '../components/common';
import { Flame, IconCheck, IconChevronRight, IconPlus } from '../components/Icons';
import { useAppState, useDay, useTargets, setSelectedDate } from '../store/store';
import { useGameStatus } from '../lib/hooks';
import { dayTotals, fmt } from '../lib/nutrition';
import { diffDays, greeting, todayKey } from '../lib/dates';
import { isStandalone } from '../lib/storage';
import { AddFoodSheet } from './FoodSheets';
import { AnalysisSheet } from './Analysis';
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

  const totals = dayTotals(day);
  const has = (m: MealId) => day.entries.some((e) => e.meal === m);
  const lastWeight = state.weights[state.weights.length - 1];
  const weighedRecently = !!lastWeight && diffDays(today, lastWeight.date) < 7;

  const tasks = [
    { id: 'desayuno', icon: '🥐', title: 'Registra tu desayuno', done: has('desayuno'), action: () => setAddMeal('desayuno') },
    { id: 'comida', icon: '🍲', title: 'Registra tu comida', done: has('comida'), action: () => setAddMeal('comida') },
    { id: 'cena', icon: '🥗', title: 'Registra tu cena', done: has('cena'), action: () => setAddMeal('cena') },
    { id: 'agua', icon: '💧', title: `Bebe ${fmt(targets.waterMl / 1000, 1)} l de agua`, sub: `${fmt(day.waterMl / 1000, 2)} l hasta ahora`, done: day.waterMl >= targets.waterMl, action: () => { setSelectedDate(today); go('diario'); } },
    { id: 'mover', icon: '👟', title: 'Muévete un poco', sub: 'Registra una actividad', done: day.activities.length > 0, action: () => { setSelectedDate(today); go('diario'); } },
    ...(!weighedRecently ? [{ id: 'peso', icon: '⚖️', title: '¡Es hora de pesarte!', sub: 'Una vez por semana es suficiente', done: false, action: () => setWeightOpen(true) }] : [])
  ];
  const doneCount = tasks.filter((t) => t.done).length;

  const daysSinceBackup = state.lastBackupAt ? diffDays(today, state.lastBackupAt.slice(0, 10)) : null;
  const hasData = Object.keys(state.days).length > 2;
  const needsBackup = hasData && (daysSinceBackup == null || daysSinceBackup >= 7);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const sky = SCENES[state.pet.equipped.scene] ?? SCENES.prado;

  return (
    <div className="screen">
      <div className="home-hero" style={{ background: `linear-gradient(180deg, ${sky.sky[0]}, var(--bg))` }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <h1 className="serif" style={{ fontSize: 32, lineHeight: 1.15, whiteSpace: 'pre-line', color: state.pet.equipped.scene === 'noche' ? '#fff' : undefined }}>
            {greeting()}
            {state.profile.name ? `,\n${state.profile.name}` : ''}
          </h1>
          <span className="pill num" style={{ color: 'var(--flame)' }}><Flame /> {game.streak}</span>
        </div>
        <button className="center" style={{ display: 'block', margin: '4px auto 0' }} onClick={() => go('mascota')} aria-label="Ver mascota">
          <Mascot equipped={state.pet.equipped} level={game.level} mood={game.mood} size={170} scene={false} />
        </button>
        <p className="center muted small" style={{ marginTop: -6 }}>
          {petLine(state.pet.name, game.mood, doneCount, tasks.length)}
        </p>
      </div>

      {!isStandalone() && isIOS && (
        <div className="banner" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 24 }}>📲</span>
          <div className="small">
            <b>Instálala en tu iPhone</b>
            <div className="muted">Pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>. Así funciona a pantalla completa, sin conexión, y tus datos quedan protegidos frente al borrado automático de Safari.</div>
          </div>
        </div>
      )}

      {needsBackup && (
        <button className="banner" style={{ marginTop: 12, width: '100%', textAlign: 'left', background: 'var(--info-bg)' }} onClick={openData}>
          <span style={{ fontSize: 24 }}>☁️</span>
          <div className="small grow">
            <b>Haz una copia de seguridad</b>
            <div className="muted">{daysSinceBackup == null ? 'Aún no has guardado ninguna copia.' : `Tu última copia es de hace ${daysSinceBackup} días.`} Guárdala en iCloud Drive en 2 toques.</div>
          </div>
          <IconChevronRight size={18} />
        </button>
      )}

      <div className="row between" style={{ margin: '26px 0 14px' }}>
        <h2 className="serif" style={{ fontSize: 26 }}>Tus tareas de hoy</h2>
        <div className="row" style={{ gap: 8 }}>
          <div className="bar" style={{ width: 70 }}><span style={{ width: `${(doneCount / tasks.length) * 100}%`, background: 'var(--good)' }} /></div>
          <span className="num"><b>{doneCount}</b><span className="faint">/{tasks.length}</span></span>
        </div>
      </div>
      {tasks.map((t) => (
        <button key={t.id} className={`task${t.done ? ' done' : ''}`} onClick={t.action}>
          <span className="task-icon">{t.icon}</span>
          <span className="grow">
            <b style={{ display: 'block' }}>{t.title}</b>
            {t.sub && <span className="small muted">{t.sub}</span>}
          </span>
          <span className="check">{t.done && <IconCheck size={16} />}</span>
        </button>
      ))}

      <h2 className="section-title">Mi objetivo</h2>
      <button className="card" style={{ width: '100%' }} onClick={() => setAnalysisOpen(true)}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <span className="muted">Hoy</span>
          <span className="num"><b>{fmt(totals.kcal)}</b> <span className="faint">/ {fmt(targets.kcal)} kcal</span></span>
        </div>
        <MacroRings value={totals} target={targets} />
      </button>

      <button className="card row" style={{ width: '100%', marginTop: 14, textAlign: 'left' }} onClick={() => setWeightOpen(true)}>
        <span className="task-icon" style={{ background: 'var(--carbs-bg)' }}>⚖️</span>
        <span className="grow">
          <span style={{ display: 'block', fontSize: 18 }}>Mi peso</span>
          <span className="small muted">{lastWeight ? `${fmt(lastWeight.kg, 1)} kg · ${lastWeight.date === today ? 'hoy' : `hace ${diffDays(today, lastWeight.date)} días`}` : 'Sin registros todavía'}</span>
        </span>
        <span className="icon-btn"><IconPlus size={20} /></span>
      </button>

      <h2 className="section-title">Mis herramientas</h2>
      <div className="tool-grid">
        <button className="tool" style={{ background: '#FFC9C7' }} onClick={() => setFoodsOpen(true)}>
          <span className="tool-emoji">🥗</span>
          <b>Mis alimentos</b>
          <span>{state.customFoods.length} propios · {state.recentFoods.length} recientes</span>
        </button>
        <button className="tool" style={{ background: '#8ED3C4' }} onClick={() => go('logros')}>
          <span className="tool-emoji">🏆</span>
          <b>Mis logros</b>
          <span>{Object.keys(state.achievements).length} desbloqueados</span>
        </button>
        <button className="tool" style={{ background: '#DCE38C' }} onClick={() => go('perfil')}>
          <span className="tool-emoji">📈</span>
          <b>Mi progreso</b>
          <span>Peso y nutrición</span>
        </button>
        <button className="tool" style={{ background: '#BFE0F7' }} onClick={openData}>
          <span className="tool-emoji">☁️</span>
          <b>Copia de seguridad</b>
          <span>{daysSinceBackup == null ? 'Sin copias' : daysSinceBackup === 0 ? 'Hecha hoy' : `Hace ${daysSinceBackup} días`}</span>
        </button>
      </div>

      <AddFoodSheet open={addMeal !== null} onClose={() => setAddMeal(null)} date={today} meal={addMeal ?? 'desayuno'} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <MyFoodsSheet open={foodsOpen} onClose={() => setFoodsOpen(false)} />
      <AnalysisSheet open={analysisOpen} onClose={() => setAnalysisOpen(false)} date={today} />
    </div>
  );
}

function petLine(name: string, mood: string, done: number, total: number): string {
  if (mood === 'dormido') return `${name} está echando una siesta… ¡despiértale registrando algo!`;
  if (done === total) return `¡${name} está orgulloso! Has completado todo hoy.`;
  if (mood === 'eufórico') return `¡${name} está que no cabe en sí de alegría!`;
  return `${name} te acompaña. Llevas ${done} de ${total} tareas.`;
}
