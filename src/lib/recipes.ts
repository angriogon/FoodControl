import type { Food, FoodEntry, MealId, Menu, Nutrients, Portion, Recipe } from '../types';
import { estimateGrade, foodGrade, scaleNutrients, sumNutrients } from './nutrition';

// ─────────────── Platos ───────────────

export function portionNutrients(p: Portion): Nutrients {
  return scaleNutrients(p.food.per100, p.amount);
}

/** Totales del plato completo (todas las raciones) */
export function recipeTotals(r: Recipe): Nutrients {
  return sumNutrients(r.ingredients.map(portionNutrients));
}

/** Peso del plato: el cocinado si se indicó (el agua se evapora o se absorbe), si no la suma de ingredientes */
export function recipeWeight(r: Recipe): number {
  return r.cookedWeightG && r.cookedWeightG > 0 ? r.cookedWeightG : r.ingredients.reduce((s, i) => s + i.amount, 0);
}

export function perServing(r: Recipe): Nutrients {
  const t = recipeTotals(r);
  const k = 1 / Math.max(r.servings, 0.5);
  return scaleNutrients({ ...t }, 100 * k);
}

/**
 * Convierte un plato en un “alimento” con valores por 100 g y una ración.
 * Así el plato se busca, se añade y se ajusta igual que cualquier alimento.
 */
export function recipeToFood(r: Recipe): Food {
  const weight = Math.max(1, recipeWeight(r));
  const t = recipeTotals(r);
  const per100 = scaleNutrients(t, (100 / weight) * 100);
  per100.kcal = Math.round((t.kcal / weight) * 100);
  return {
    id: `recipe:${r.id}`,
    name: r.name,
    unit: 'g',
    per100,
    serving: { label: '1 ración', grams: Math.round(weight / Math.max(r.servings, 0.5)) },
    grade: gradeOfRecipe(r, per100),
    source: 'recipe',
    emoji: r.emoji
  };
}

/** Calidad del plato: media de la calidad de sus ingredientes ponderada por kcal */
function gradeOfRecipe(r: Recipe, per100: Nutrients) {
  const pts = { A: 100, B: 80, C: 55, D: 30, E: 10 } as const;
  let total = 0;
  let w = 0;
  for (const i of r.ingredients) {
    const k = portionNutrients(i).kcal;
    if (k <= 0) continue;
    total += pts[foodGrade(i.food)] * k;
    w += k;
  }
  if (!w) return estimateGrade(per100);
  const s = total / w;
  return s >= 85 ? 'A' : s >= 65 ? 'B' : s >= 45 ? 'C' : s >= 22 ? 'D' : 'E';
}

// ─────────────── Menús ───────────────

export function menuTotals(m: Menu, factor = 1): Nutrients {
  return sumNutrients(m.items.map((i) => scaleNutrients(i.food.per100, i.amount * factor)));
}

/** Crea los registros del diario para un menú. `skip` = índices de elementos a no incluir hoy */
export function menuToEntries(m: Menu, meal: MealId, factor = 1, skip: Set<number> = new Set(), uid: () => string): FoodEntry[] {
  const groupId = uid();
  const now = new Date().toISOString();
  return m.items
    .filter((_, i) => !skip.has(i))
    .map((p) => portionToEntry(p, meal, factor, uid(), now, { groupId, groupName: m.name }));
}

export function portionToEntry(
  p: Portion, meal: MealId, factor: number, id: string, createdAt: string, group?: { groupId: string; groupName: string }
): FoodEntry {
  const amount = Math.round(p.amount * factor * 10) / 10;
  return {
    id,
    meal,
    foodId: p.food.id,
    name: p.food.brand ? `${p.food.name} (${p.food.brand})` : p.food.name,
    amount,
    unit: p.food.unit,
    nutrients: scaleNutrients(p.food.per100, amount),
    grade: foodGrade(p.food),
    emoji: p.food.emoji,
    createdAt,
    ...group
  };
}

/** Reconstruye un alimento a partir de un registro (para “Guardar como menú”) */
export function entryToPortion(e: FoodEntry): Portion {
  // Un “añadido rápido” no tiene peso: se guarda como 100 g de un alimento con esos valores
  const amount = e.unit === 'kcal' || e.amount <= 0 ? 100 : e.amount;
  const f = 100 / amount;
  const k = (v?: number) => Math.round((v ?? 0) * f * 100) / 100;
  return {
    amount,
    food: {
      id: e.foodId ?? `entry:${e.id}`,
      name: e.name,
      unit: e.unit === 'ml' ? 'ml' : 'g',
      per100: {
        kcal: Math.round(e.nutrients.kcal * f), protein: k(e.nutrients.protein), carbs: k(e.nutrients.carbs), fat: k(e.nutrients.fat),
        fiber: k(e.nutrients.fiber), sugar: k(e.nutrients.sugar), satFat: k(e.nutrients.satFat), salt: k(e.nutrients.salt)
      },
      grade: e.grade,
      emoji: e.emoji,
      source: 'custom'
    }
  };
}

export function describeItems(items: Portion[], max = 3): string {
  const names = items.map((i) => i.food.name);
  return names.length > max ? `${names.slice(0, max).join(', ')} y ${names.length - max} más` : names.join(', ');
}
