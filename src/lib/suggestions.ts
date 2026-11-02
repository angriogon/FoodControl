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

  // 1) Combinación habitual: misma lista de alimentos a esta comida ≥ 2 veces en 45 días
  const counts = new Map<string, { n: number; lastDate: string }>();
  for (let i = 1; i <= 45; i++) {
    const d = addDays(date, -i);
    const entries = state.days[d]?.entries.filter((e) => e.meal === meal) ?? [];
    if (!entries.length) continue;
    const sig = [...new Set(entries.map((e) => e.foodId ?? e.name))].sort().join('|');
    const c = counts.get(sig);
    if (c) c.n++;
    else counts.set(sig, { n: 1, lastDate: d });
  }
  const habitual = [...counts.entries()].filter(([, c]) => c.n >= 2).sort((a, b) => b[1].n - a[1].n)[0];
  if (habitual) {
    const [sig, { n, lastDate }] = habitual;
    const ids = sig.split('|');
    if (!ids.every((id) => already.has(id))) {
      const portions = state.days[lastDate].entries.filter((e) => e.meal === meal).map(entryToPortion);
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
