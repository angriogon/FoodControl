import type { AppState, DayLog, Targets } from '../types';
import { addDays, todayKey } from './dates';
import { dayQuality, dayTotals } from './nutrition';

// ─────────────── Gemas ───────────────
// Se DERIVAN del historial en vez de guardarse como contador. Ventajas:
//  · no se pueden “farmear” añadiendo y borrando comidas,
//  · tras restaurar una copia de seguridad el saldo es exactamente el mismo,
//  · si cambian las reglas, se recalculan solas.

export interface DayReward {
  meals: number;
  water: number;
  balance: number;
  quality: number;
  activity: number;
  note: number;
  total: number;
}

export function dayReward(day: DayLog | undefined, targets: Targets): DayReward {
  const r: DayReward = { meals: 0, water: 0, balance: 0, quality: 0, activity: 0, note: 0, total: 0 };
  if (!day) return r;
  const mealsLogged = new Set(day.entries.map((e) => e.meal)).size;
  r.meals = mealsLogged * 10;
  if (day.waterMl >= targets.waterMl) r.water = 15;
  const kcal = dayTotals(day).kcal;
  if (mealsLogged >= 3 && Math.abs(kcal - targets.kcal) <= targets.kcal * 0.1) r.balance = 25;
  const q = dayQuality(day.entries);
  if (q != null && q >= 70 && day.entries.length >= 2) r.quality = 20;
  if (day.activities.length) r.activity = 10;
  if (day.note.trim().length >= 10) r.note = 5;
  r.total = r.meals + r.water + r.balance + r.quality + r.activity + r.note;
  return r;
}

export const ACHIEVEMENT_BONUS = 50;

export function gemsEarned(state: AppState, targets: Targets): number {
  const today = todayKey();
  let total = 0;
  for (const [key, day] of Object.entries(state.days)) {
    if (key <= today) total += dayReward(day, targets).total;
  }
  return total + Object.keys(state.achievements).length * ACHIEVEMENT_BONUS;
}

export function gemsBalance(state: AppState, targets: Targets): number {
  return Math.max(0, gemsEarned(state, targets) - state.gemsSpent);
}

/** Nivel de la mascota según las gemas ganadas (no las gastadas). */
export function levelInfo(earned: number) {
  const level = Math.floor(Math.sqrt(earned / 40)) + 1;
  const curr = 40 * (level - 1) ** 2;
  const next = 40 * level ** 2;
  return { level, progress: (earned - curr) / (next - curr), toNext: next - earned };
}

// ─────────────── Rachas ───────────────

function hasLog(day: DayLog | undefined): boolean {
  return !!day && day.entries.length > 0;
}

/** Racha actual: días seguidos con algo registrado. Si hoy aún no hay nada, cuenta desde ayer. */
export function currentStreak(state: AppState): number {
  let key = todayKey();
  if (!hasLog(state.days[key])) key = addDays(key, -1);
  let n = 0;
  while (hasLog(state.days[key])) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

export function bestStreak(state: AppState): number {
  const keys = Object.keys(state.days).filter((k) => hasLog(state.days[k])).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

// ─────────────── Estadísticas y logros ───────────────

export interface Stats {
  entries: number;
  daysLogged: number;
  bestStreak: number;
  waterDays: number;
  healthyDays: number;
  balancedDays: number;
  proteinDays: number;
  fiberDays: number;
  allMealsDays: number;
  activities: number;
  weighIns: number;
  kgLost: number;
}

export function computeStats(state: AppState, targets: Targets): Stats {
  const today = todayKey();
  const s: Stats = {
    entries: 0, daysLogged: 0, bestStreak: bestStreak(state), waterDays: 0, healthyDays: 0, balancedDays: 0,
    proteinDays: 0, fiberDays: 0, allMealsDays: 0, activities: 0, weighIns: state.weights.length, kgLost: 0
  };
  for (const [key, day] of Object.entries(state.days)) {
    if (key > today) continue;
    s.entries += day.entries.length;
    s.activities += day.activities.length;
    if (day.entries.length) s.daysLogged++;
    if (day.waterMl >= targets.waterMl) s.waterDays++;
    const r = dayReward(day, targets);
    if (r.quality) s.healthyDays++;
    if (r.balance) s.balancedDays++;
    const t = dayTotals(day);
    if (t.protein >= targets.protein * 0.9) s.proteinDays++;
    if (t.fiber >= targets.fiber) s.fiberDays++;
    if (new Set(day.entries.map((e) => e.meal)).size === 4) s.allMealsDays++;
  }
  if (state.weights.length) {
    const min = Math.min(...state.weights.map((w) => w.kg));
    s.kgLost = Math.max(0, state.profile.startWeightKg - min);
  }
  return s;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Artículo de la mascota que desbloquea */
  reward: string;
  check: (s: Stats) => boolean;
  progress: (s: Stats) => [number, number];
}

const a = (
  id: string, title: string, description: string, emoji: string, reward: string,
  value: (s: Stats) => number, goal: number
): Achievement => ({
  id, title, description, emoji, reward,
  check: (s) => value(s) >= goal,
  progress: (s) => [Math.min(value(s), goal), goal]
});

export const ACHIEVEMENTS: Achievement[] = [
  a('first-entry', 'Primer bocado', 'Registra tu primer alimento', '🍽️', 'hat:flor', (s) => s.entries, 1),
  a('streak-3', 'Constancia', '3 días seguidos registrando', '🔥', 'neck:pajarita', (s) => s.bestStreak, 3),
  a('streak-7', 'Semana redonda', '7 días seguidos registrando', '📅', 'face:gafas-sol', (s) => s.bestStreak, 7),
  a('streak-14', 'Imparable', '14 días seguidos registrando', '⛰️', 'scene:montana', (s) => s.bestStreak, 14),
  a('streak-30', 'Hábito de hierro', '30 días seguidos registrando', '👑', 'hat:corona', (s) => s.bestStreak, 30),
  a('water-1', 'Bien hidratado', 'Cumple tu objetivo de agua', '💧', 'color:cielo', (s) => s.waterDays, 1),
  a('water-7', 'Fuente de vida', 'Cumple el objetivo de agua 7 días', '🌊', 'scene:playa', (s) => s.waterDays, 7),
  a('healthy-5', 'Comida real', '5 días con alimentación de calidad', '🥦', 'color:menta', (s) => s.healthyDays, 5),
  a('balanced-1', 'En su punto', 'Un día dentro de tu objetivo de kcal (±10%)', '🎯', 'hat:chef', (s) => s.balancedDays, 1),
  a('balanced-10', 'Maestro del equilibrio', '10 días dentro de tu objetivo de kcal', '⚖️', 'scene:cocina', (s) => s.balancedDays, 10),
  a('protein-5', 'Proteína al día', 'Alcanza tu proteína 5 días', '💪', 'color:melocoton', (s) => s.proteinDays, 5),
  a('fiber-5', 'Fibra a tope', 'Alcanza tu objetivo de fibra 5 días', '🌾', 'neck:collar-flores', (s) => s.fiberDays, 5),
  a('all-meals-7', 'Las 4 comidas', 'Registra las 4 comidas en 7 días distintos', '🗓️', 'neck:medalla', (s) => s.allMealsDays, 7),
  a('activity-1', 'En movimiento', 'Registra tu primera actividad', '👟', 'hat:gorra', (s) => s.activities, 1),
  a('activity-15', 'Deportista', 'Registra 15 actividades', '🏅', 'neck:bufanda', (s) => s.activities, 15),
  a('weight-1', 'Punto de partida', 'Registra tu peso', '⚖️', 'face:gafas', (s) => s.weighIns, 1),
  a('lost-2', 'Primeros kilos', 'Pierde 2 kg desde tu peso inicial', '📉', 'color:lavanda', (s) => s.kgLost, 2),
  a('lost-5', 'Gran cambio', 'Pierde 5 kg desde tu peso inicial', '🌟', 'color:dorado', (s) => s.kgLost, 5),
  a('entries-150', 'Diario experto', 'Registra 150 alimentos', '📖', 'scene:noche', (s) => s.entries, 150)
];
