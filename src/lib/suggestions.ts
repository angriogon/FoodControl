import type { AppState, MealId, Portion } from '../types';
import { addDays } from './dates';
import { entryToPortion, menuTotals } from './recipes';
import { scaleNutrients, sumNutrients } from './nutrition';

// Sugerencias “lo de siempre”: detecta combinaciones que repites a la misma
// comida y los menús guardados para esa comida, para añadirlos de un toque.

export interface Suggestion {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  kcal: number;
  portions: Portion[];
  /** Nombre con el que se agrupan los registros en el diario */
  groupName: string;
  menuId?: string;
}

/** Comida más probable según la hora (horarios españoles) */
export function mealForNow(d = new Date()): MealId {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 11.5) return 'desayuno';
  if (h >= 11.5 && h < 13) return 'snacks';
  if (h >= 13 && h < 16.5) return 'comida';
  if (h >= 16.5 && h < 20) return 'snacks';
  return 'cena';
}

const MEAL_NAME: Record<MealId, string> = { desayuno: 'desayuno', comida: 'comida', cena: 'cena', snacks: 'snack' };

export function suggestionsFor(state: AppState, meal: MealId, date: string, max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const already = new Set((state.days[date]?.entries ?? []).filter((e) => e.meal === meal).map((e) => e.foodId ?? e.name));

  // 1) Comida habitual: la combinación que más se repite a esta comida en 45
  //    días, aceptando comidas “casi iguales” (≥ 60 % de alimentos en común:
  //    “lo de siempre pero sin plátano” cuenta). Si hay datos suficientes, se
  //    miran solo los días del mismo tipo (laborable o fin de semana).
  const habitual = habitualMeal(state, meal, date);
  if (habitual) {
    const { day, n } = habitual;
    const portions = state.days[day].entries.filter((e) => e.meal === meal).map(entryToPortion);
    const ids = portions.map((p) => p.food.id);
    if (!ids.every((id) => already.has(id))) {
      out.push({
        key: `habitual-${meal}`,
        title: `Tu ${MEAL_NAME[meal]} habitual`,
        subtitle: `${portions.map((p) => p.food.name).join(', ')} · ${n} veces en las últimas semanas`,
        emoji: '🔁',
        kcal: Math.round(sumNutrients(portions.map((p) => scaleNutrients(p.food.per100, p.amount))).kcal),
        portions,
        groupName: `${MEAL_NAME[meal][0].toUpperCase()}${MEAL_NAME[meal].slice(1)} habitual`
      });
    }
  }

  // 2) Menús guardados para esta comida, los más usados primero
  for (const m of [...state.menus].filter((x) => x.meal === meal).sort((a, b) => b.uses - a.uses)) {
    if (out.length >= max) break;
    out.push({
      key: `menu-${m.id}`,
      title: m.name,
      subtitle: m.items.map((i) => i.food.name).join(', '),
      emoji: m.emoji,
      kcal: Math.round(menuTotals(m).kcal),
      portions: m.items,
      groupName: m.name,
      menuId: m.id
    });
  }
  return out.slice(0, max);
}

const isWeekend = (d: string) => {
  const w = new Date(`${d}T12:00:00`).getDay();
  return w === 0 || w === 6;
};

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Busca el día cuya comida se parece a más días (incluido él mismo) y devuelve
 * el más reciente de ese grupo, con cuántas veces se repite. Exige ≥ 2.
 */
export function habitualMeal(state: AppState, meal: MealId, date: string, windowDays = 45): { day: string; n: number } | null {
  const days: { day: string; set: Set<string> }[] = [];
  for (let i = 1; i <= windowDays; i++) {
    const d = addDays(date, -i);
    const entries = state.days[d]?.entries.filter((e) => e.meal === meal) ?? [];
    if (entries.length) days.push({ day: d, set: new Set(entries.map((e) => e.foodId ?? e.name)) });
  }
  // Mismo tipo de día si hay al menos 3 así; si no, todos
  const sameType = days.filter((x) => isWeekend(x.day) === isWeekend(date));
  const pool = sameType.length >= 3 ? sameType : days;
  let best: { day: string; n: number } | null = null;
  for (const a of pool) {
    const n = pool.filter((b) => jaccard(a.set, b.set) >= 0.6).length;
    // `pool` va de más reciente a más antiguo: con empate gana el más reciente
    if (n >= 2 && (!best || n > best.n)) best = { day: a.day, n };
  }
  return best;
}
