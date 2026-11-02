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

export function gemsEarned(state: AppState, targets: Targets): number {
  const today = todayKey();
  let total = 0;
  for (const [key, day] of Object.entries(state.days)) {
    if (key <= today) total += dayReward(day, targets).total;
  }
  for (const id of Object.keys(state.achievements)) {
    total += ACHIEVEMENT_BY_ID[id]?.gems ?? (LEGACY_REWARDS[id] ? LEGACY_GEMS : 0);
  }
  return total;
}

export function gemsBalance(state: AppState, targets: Targets): number {
  return Math.max(0, gemsEarned(state, targets) - state.gemsSpent);
}

/**
 * Nivel de la mascota según las gemas ganadas (no las gastadas).
 * Curva cuadrática: cada nivel cuesta más que el anterior. Con un uso
 * constante se llega a ~nivel 10 en 4–5 meses y a ~nivel 18 en un año.
 */
const LEVEL_K = 120;
export function levelInfo(earned: number) {
  const level = Math.floor(Math.sqrt(earned / LEVEL_K)) + 1;
  const curr = LEVEL_K * (level - 1) ** 2;
  const next = LEVEL_K * level ** 2;
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
  weeksActive: number;
  bestStreak: number;
  distinctFoods: number;
  customFoods: number;
  waterDays: number;
  healthyDays: number;
  balancedDays: number;
  proteinDays: number;
  fiberDays: number;
  allMealsDays: number;
  activities: number;
  activityMinutes: number;
  noteDays: number;
  weighIns: number;
  /** kg avanzados hacia el objetivo (perdidos si quieres bajar, ganados si quieres subir) */
  kgProgress: number;
  goalReached: number;
}

/** Lunes de la semana de una fecha, para agrupar por semanas */
function weekKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = (date.getDay() + 6) % 7; // lunes = 0
  return addDays(key, -dow);
}

export function computeStats(state: AppState, targets: Targets): Stats {
  const today = todayKey();
  const s: Stats = {
    entries: 0, daysLogged: 0, weeksActive: 0, bestStreak: bestStreak(state), distinctFoods: 0,
    customFoods: state.customFoods.length + state.recipes.length, waterDays: 0, healthyDays: 0, balancedDays: 0, proteinDays: 0,
    fiberDays: 0, allMealsDays: 0, activities: 0, activityMinutes: 0, noteDays: 0, weighIns: state.weights.length,
    kgProgress: 0, goalReached: 0
  };
  const foods = new Set<string>();
  const weeks = new Map<string, number>();
  for (const [key, day] of Object.entries(state.days)) {
    if (key > today) continue;
    s.entries += day.entries.length;
    s.activities += day.activities.length;
    s.activityMinutes += day.activities.reduce((m, a) => m + (a.minutes || 0), 0);
    if (day.note.trim().length >= 10) s.noteDays++;
    for (const e of day.entries) foods.add(e.foodId ?? e.name.toLowerCase());
    if (day.entries.length) {
      s.daysLogged++;
      const w = weekKey(key);
      weeks.set(w, (weeks.get(w) ?? 0) + 1);
    }
    if (day.waterMl >= targets.waterMl) s.waterDays++;
    const r = dayReward(day, targets);
    if (r.quality) s.healthyDays++;
    if (r.balance) s.balancedDays++;
    const t = dayTotals(day);
    if (t.protein >= targets.protein * 0.9) s.proteinDays++;
    if (t.fiber >= targets.fiber) s.fiberDays++;
    if (new Set(day.entries.map((e) => e.meal)).size === 4) s.allMealsDays++;
  }
  s.distinctFoods = foods.size;
  s.weeksActive = [...weeks.values()].filter((n) => n >= 5).length;
  const { goal, startWeightKg, goalWeightKg } = state.profile;
  if (state.weights.length) {
    const kgs = state.weights.map((w) => w.kg);
    if (goal === 'perder') {
      s.kgProgress = Math.max(0, startWeightKg - Math.min(...kgs));
      s.goalReached = Math.min(...kgs) <= goalWeightKg ? 1 : 0;
    } else if (goal === 'ganar') {
      s.kgProgress = Math.max(0, Math.max(...kgs) - startWeightKg);
      s.goalReached = Math.max(...kgs) >= goalWeightKg ? 1 : 0;
    } else {
      // Mantener: medio año de pesajes sin desviarse más de 2 kg
      s.goalReached = kgs.length >= 26 && kgs.every((k) => Math.abs(k - goalWeightKg) <= 2) ? 1 : 0;
    }
  }
  return s;
}

export type SeriesId =
  | 'racha' | 'dias' | 'semanas' | 'alimentos' | 'variedad' | 'recetas' | 'agua' | 'calidad' | 'equilibrio'
  | 'proteina' | 'fibra' | 'comidas4' | 'actividad' | 'minutos' | 'pesajes' | 'kilos' | 'objetivo' | 'notas';

export const SERIES: Record<SeriesId, { name: string; emoji: string }> = {
  racha: { name: 'Racha', emoji: '🔥' },
  dias: { name: 'Días registrados', emoji: '📅' },
  semanas: { name: 'Semanas constantes', emoji: '🗓️' },
  alimentos: { name: 'Alimentos registrados', emoji: '📖' },
  variedad: { name: 'Variedad', emoji: '🌈' },
  recetas: { name: 'Recetas propias', emoji: '👩‍🍳' },
  agua: { name: 'Hidratación', emoji: '💧' },
  calidad: { name: 'Calidad', emoji: '🥦' },
  equilibrio: { name: 'Equilibrio', emoji: '🎯' },
  proteina: { name: 'Proteína', emoji: '💪' },
  fibra: { name: 'Fibra', emoji: '🌾' },
  comidas4: { name: 'Las 4 comidas', emoji: '🍽️' },
  actividad: { name: 'Actividad', emoji: '👟' },
  minutos: { name: 'Horas de ejercicio', emoji: '⏱️' },
  pesajes: { name: 'Seguimiento de peso', emoji: '⚖️' },
  kilos: { name: 'Progreso de peso', emoji: '📉' },
  objetivo: { name: 'Meta', emoji: '🏁' },
  notas: { name: 'Diario personal', emoji: '✏️' }
};

export interface Achievement {
  id: string;
  series: SeriesId;
  /** 1 = primer nivel de la serie */
  tier: number;
  title: string;
  description: string;
  emoji: string;
  /** Gemas que da al desbloquearse */
  gems: number;
  /** Artículo exclusivo de la mascota (opcional) */
  reward?: string;
  value: (s: Stats) => number;
  goal: number;
  check: (s: Stats) => boolean;
  progress: (s: Stats) => [number, number];
}

type Def = [title: string, description: string, emoji: string, goal: number, gems: number, reward?: string];

function series(id: SeriesId, value: (s: Stats) => number, defs: Def[]): Achievement[] {
  return defs.map(([title, description, emoji, goal, gems, reward], i) => ({
    id: `${id}-${goal}`, series: id, tier: i + 1, title, description, emoji, goal, gems, reward, value,
    check: (s) => value(s) >= goal,
    progress: (s) => [Math.min(value(s), goal), goal]
  }));
}

// Pensados para un uso continuado durante años: los primeros niveles llegan
// en semanas, los últimos requieren meses o años de constancia.
export const ACHIEVEMENTS: Achievement[] = [
  ...series('racha', (s) => s.bestStreak, [
    ['Una semana', '7 días seguidos registrando', '🔥', 7, 100, 'neck:pajarita'],
    ['Hábito en marcha', '21 días seguidos registrando', '🔥', 21, 200, 'face:gafas-sol'],
    ['Imparable', '45 días seguidos registrando', '⛰️', 45, 350, 'scene:montana'],
    ['Trimestre perfecto', '90 días seguidos registrando', '🏛️', 90, 700, 'hat:laurel'],
    ['Medio año', '180 días seguidos registrando', '🦸', 180, 1200, 'body:superheroe'],
    ['Un año entero', '365 días seguidos registrando', '👑', 365, 3000, 'hat:corona']
  ]),
  ...series('dias', (s) => s.daysLogged, [
    ['Primer mes', '30 días con registros', '📅', 30, 150, 'hat:flor'],
    ['Centenario', '100 días con registros', '💯', 100, 350, 'neck:medalla'],
    ['Veterano', '250 días con registros', '🌙', 250, 700, 'scene:noche'],
    ['Leyenda del diario', '500 días con registros', '🏆', 500, 1500, 'color:oro'],
    ['Mil días', '1000 días con registros', '😇', 1000, 4000, 'hat:halo']
  ]),
  ...series('semanas', (s) => s.weeksActive, [
    ['Mes constante', '4 semanas registrando al menos 5 días', '🗓️', 4, 150],
    ['Trimestre constante', '12 semanas registrando al menos 5 días', '🗓️', 12, 350, 'body:chaleco'],
    ['Semestre constante', '26 semanas registrando al menos 5 días', '🗓️', 26, 800],
    ['Año constante', '52 semanas registrando al menos 5 días', '⭐', 52, 2000, 'pal:estrella']
  ]),
  ...series('alimentos', (s) => s.entries, [
    ['Buen registro', 'Registra 250 alimentos', '📝', 250, 100],
    ['Diario experto', 'Registra 1000 alimentos', '📖', 1000, 350, 'hand:libro'],
    ['Archivo vivo', 'Registra 3000 alimentos', '🗃️', 3000, 900],
    ['Enciclopedia', 'Registra 7500 alimentos', '🧐', 7500, 2500, 'face:monoculo']
  ]),
  ...series('variedad', (s) => s.distinctFoods, [
    ['Paladar curioso', 'Prueba 50 alimentos distintos', '🥕', 50, 150, 'hand:zanahoria'],
    ['Explorador', 'Prueba 150 alimentos distintos', '🧺', 150, 450, 'scene:mercado'],
    ['Gourmet', 'Prueba 300 alimentos distintos', '👨‍🍳', 300, 1200, 'hat:chef']
  ]),
  ...series('recetas', (s) => s.customFoods, [
    ['Cocinillas', 'Crea 5 platos o alimentos propios', '🍳', 5, 100],
    ['Recetario propio', 'Crea 25 platos o alimentos propios', '📒', 25, 450, 'body:delantal']
  ]),
  ...series('agua', (s) => s.waterDays, [
    ['Bien hidratado', 'Cumple el objetivo de agua 14 días', '💧', 14, 100, 'hand:botella'],
    ['Fuente de vida', 'Cumple el objetivo de agua 60 días', '🏖️', 60, 350, 'scene:playa'],
    ['Oasis', 'Cumple el objetivo de agua 150 días', '🐠', 150, 800, 'scene:submarino'],
    ['Océano', 'Cumple el objetivo de agua 365 días', '🤿', 365, 2000, 'face:gafas-natacion']
  ]),
  ...series('calidad', (s) => s.healthyDays, [
    ['Comida real', '15 días con alimentación de calidad', '🥦', 15, 150, 'color:menta'],
    ['Come colores', '60 días con alimentación de calidad', '🥗', 60, 450, 'hand:brocoli'],
    ['Nutrición de oro', '150 días con alimentación de calidad', '🧑‍🌾', 150, 1000, 'scene:huerto'],
    ['Maestro saludable', '300 días con alimentación de calidad', '🌻', 300, 2500, 'hat:girasol']
  ]),
  ...series('equilibrio', (s) => s.balancedDays, [
    ['En su punto', '10 días dentro de tu objetivo de kcal (±10 %)', '🎯', 10, 150, 'neck:cascabel'],
    ['Equilibrista', '50 días dentro de tu objetivo de kcal', '🤵', 50, 450, 'body:traje'],
    ['Precisión', '150 días dentro de tu objetivo de kcal', '🎩', 150, 1000, 'hat:copa'],
    ['Campeón del equilibrio', '300 días dentro de tu objetivo de kcal', '🥇', 300, 2500, 'body:cinturon']
  ]),
  ...series('proteina', (s) => s.proteinDays, [
    ['Proteína al día', 'Alcanza tu proteína 20 días', '💪', 20, 150, 'hand:pesa'],
    ['Músculo', 'Alcanza tu proteína 80 días', '🥋', 80, 450, 'body:kimono'],
    ['Titán', 'Alcanza tu proteína 200 días', '🪖', 200, 1200, 'hat:vikingo']
  ]),
  ...series('fibra', (s) => s.fiberDays, [
    ['Fibra a tope', 'Alcanza tu objetivo de fibra 20 días', '🌾', 20, 150, 'neck:collar-flores'],
    ['Digestión feliz', 'Alcanza tu objetivo de fibra 80 días', '🌸', 80, 450, 'scene:cerezo'],
    ['Rey de la fibra', 'Alcanza tu objetivo de fibra 200 días', '🌲', 200, 1200, 'scene:bosque']
  ]),
  ...series('comidas4', (s) => s.allMealsDays, [
    ['Las 4 comidas', 'Registra las 4 comidas en 14 días', '🍽️', 14, 150],
    ['Orden en la mesa', 'Registra las 4 comidas en 60 días', '🍽️', 60, 450],
    ['Ritual diario', 'Registra las 4 comidas en 180 días', '🐦', 180, 1200, 'pal:pajarito']
  ]),
  ...series('actividad', (s) => s.activities, [
    ['En movimiento', 'Registra 10 actividades', '👟', 10, 100, 'hat:cinta'],
    ['Activo', 'Registra 50 actividades', '🏃', 50, 350, 'body:deportiva'],
    ['Deportista', 'Registra 150 actividades', '📣', 150, 900, 'neck:silbato'],
    ['Atleta', 'Registra 365 actividades', '🏆', 365, 2500, 'hand:trofeo']
  ]),
  ...series('minutos', (s) => s.activityMinutes, [
    ['10 horas', 'Acumula 10 horas de ejercicio', '⏱️', 600, 150, 'hand:cronometro'],
    ['50 horas', 'Acumula 50 horas de ejercicio', '🏟️', 3000, 600, 'scene:estadio'],
    ['200 horas', 'Acumula 200 horas de ejercicio', '🐶', 12000, 2000, 'pal:perrito']
  ]),
  ...series('pesajes', (s) => s.weighIns, [
    ['Punto de partida', 'Registra tu peso 4 veces', '⚖️', 4, 100, 'face:gafas'],
    ['Seguimiento', 'Registra tu peso 26 veces', '📈', 26, 350],
    ['Un año pesándote', 'Registra tu peso 52 veces', '🎓', 52, 900, 'hat:birrete']
  ]),
  ...series('kilos', (s) => s.kgProgress, [
    ['Primeros kilos', 'Avanza 2 kg hacia tu objetivo', '📉', 2, 200, 'color:lavanda'],
    ['Gran cambio', 'Avanza 5 kg hacia tu objetivo', '🌟', 5, 500, 'color:dorado'],
    ['Transformación', 'Avanza 10 kg hacia tu objetivo', '🚀', 10, 1200, 'scene:espacio'],
    ['Nueva vida', 'Avanza 20 kg hacia tu objetivo', '🌌', 20, 3000, 'color:galaxia']
  ]),
  ...series('objetivo', (s) => s.goalReached, [
    ['Meta cumplida', 'Alcanza tu peso objetivo', '👸', 1, 3000, 'hat:tiara']
  ]),
  ...series('notas', (s) => s.noteDays, [
    ['Diario personal', 'Escribe una nota del día 15 veces', '✏️', 15, 100],
    ['Escritor', 'Escribe una nota del día 60 veces', '🎀', 60, 400, 'neck:lazo-grande']
  ])
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));

/**
 * Logros de la primera versión (más fáciles). Si ya los tenías desbloqueados
 * conservas su artículo y sus 50 gemas, aunque ya no aparezcan en la lista.
 */
export const LEGACY_GEMS = 50;
export const LEGACY_REWARDS: Record<string, string> = {
  'first-entry': 'hat:flor', 'streak-3': 'neck:pajarita', 'streak-7': 'face:gafas-sol', 'streak-14': 'scene:montana',
  'streak-30': 'hat:corona', 'water-1': 'hand:botella', 'water-7': 'scene:playa', 'healthy-5': 'color:menta',
  'balanced-1': 'hat:chef', 'balanced-10': 'body:delantal', 'protein-5': 'hand:pesa', 'fiber-5': 'neck:collar-flores',
  'all-meals-7': 'neck:medalla', 'activity-1': 'hat:cinta', 'activity-15': 'body:deportiva', 'weight-1': 'face:gafas',
  'lost-2': 'color:lavanda', 'lost-5': 'color:dorado', 'entries-150': 'scene:noche'
};
