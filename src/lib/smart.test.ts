import { describe, expect, test } from 'vitest';
import type { AppState, FoodEntry, MealId } from '../types';
import { defaultState } from '../store/defaults';
import { migrate } from '../store/defaults';
import { BASE_FOODS, searchFoods } from './foods';
import { BASE_RECIPES } from './base-recipes';
import { recipeToFood } from './recipes';
import { learnedPairs, parseQuickText, swapFood } from './quicktext';
import { oneTypo, variants } from './textmatch';
import { buildUsage, habitualAmount } from './usage';
import { habitualMeal, suggestionsFor } from './suggestions';
import { addDays } from './dates';

const pool = [...BASE_RECIPES.map(recipeToFood), ...BASE_FOODS];
const byId = (id: string) => BASE_FOODS.find((f) => f.id === `base:${id}`)!;
const names = (q: string, uses?: (id: string) => number) => searchFoods(q, BASE_FOODS, uses).map((f) => f.id);

function entry(foodId: string, amount: number, meal: MealId = 'desayuno', createdAt = '2026-01-01T08:00:00Z'): FoodEntry {
  const f = BASE_FOODS.find((x) => x.id === foodId)!;
  return { id: `${foodId}-${Math.random()}`, meal, foodId, name: f.name, amount, unit: f.unit, nutrients: { kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: 0 }, createdAt };
}
function withDays(days: Record<string, FoodEntry[]>): AppState {
  const s = defaultState();
  for (const [d, entries] of Object.entries(days)) s.days[d] = { entries, activities: [], waterMl: 0, note: '' };
  return s;
}

describe('Comparación de palabras', () => {
  test('erratas de una letra en palabras de 4+ letras', () => {
    expect(oneTypo('platno', 'platano')).toBe(true); // falta una
    expect(oneTypo('yougur', 'yogur')).toBe(true); // sobra una
    expect(oneTypo('tomtae', 'tomate')).toBe(true); // intercambio
    expect(oneTypo('arroz', 'arros')).toBe(true); // cambiada
    expect(oneTypo('pan', 'pas')).toBe(false); // palabra corta: no
    expect(oneTypo('pollo', 'pavo')).toBe(false);
  });
  test('variantes: singular y sinónimo', () => {
    expect(variants('papas')).toContain('patata');
    expect(variants('bocata')).toContain('bocadillo');
    expect(variants('yogurt')).toContain('yogur');
  });
});

describe('Buscador', () => {
  test('sinónimos y plurales', () => {
    expect(names('papas')[0]).toMatch(/patata/);
    expect(names('yogurt').length).toBeGreaterThan(0);
    expect(names('huevos')).toContain('base:huevo');
  });
  test('un sinónimo corto no se cuela dentro de otras palabras', () => {
    // “infusión” → “té”: no debe encontrar todo lo que contiene “te” (tomate, aceite…)
    const r = names('infusion');
    expect(r).toContain('base:te');
    expect(r).not.toContain('base:tomate');
  });
  test('erratas solo cuando hay pocos resultados', () => {
    expect(names('platno')[0]).toBe('base:platano');
    expect(names('brocoli')[0]).toBe('base:brocoli');
  });
  test('lo que más usas sube dentro de coincidencias parecidas', () => {
    const plain = names('yogur');
    const fav = 'base:yogur-proteico';
    expect(plain[0]).not.toBe(fav);
    expect(names('yogur', (id) => (id === fav ? 12 : 0))[0]).toBe(fav);
  });
});

describe('Uso y cantidad habitual', () => {
  test('cuenta usos y la cantidad que más repites', () => {
    const s = withDays({
      '2026-01-01': [entry('base:avena', 40)],
      '2026-01-02': [entry('base:avena', 30)],
      '2026-01-03': [entry('base:avena', 31)],
      '2026-01-04': [entry('base:avena', 29)]
    });
    const u = buildUsage(s.days).get('base:avena')!;
    expect(u.uses).toBe(4);
    expect(u.amounts[0]).toBe(29); // la más reciente primero
    expect(habitualAmount(u)).toBe(30); // 29, 30, 31 ≈ 30
  });
  test('sin repetición usa la última y sin datos no inventa', () => {
    expect(habitualAmount({ uses: 2, amounts: [55, 120], lastDate: '' })).toBe(55);
    expect(habitualAmount(undefined)).toBeUndefined();
  });
});

describe('Registro por texto inteligente', () => {
  test('sin cantidad usa tu cantidad habitual', () => {
    const [i] = parseQuickText('avena', pool, { habitual: (id) => (id === 'base:avena' ? 35 : undefined) });
    expect(i.amount).toBe(35);
    expect(i.habitual).toBe(true);
    expect(i.estimated).toBe(false);
    // Con cantidad escrita, manda lo escrito
    expect(parseQuickText('50 g de avena', pool, { habitual: () => 35 })[0].amount).toBe(50);
  });
  test('sinónimos y erratas', () => {
    expect(parseQuickText('2 papas cocidas', pool)[0].food?.id).toBe('base:patata-cocida');
    expect(parseQuickText('un platno', pool)[0].food?.id).toBe('base:platano');
  });
  test('aprende de tus correcciones', () => {
    const [i] = parseQuickText('pollo', pool);
    const fixed = swapFood(i, byId('muslo-pollo'));
    const pairs = learnedPairs([fixed]);
    expect(pairs).toEqual([['pollo', 'base:muslo-pollo']]);
    const aliases = Object.fromEntries(pairs);
    expect(parseQuickText('200 g de pollo', pool, { aliases })[0].food?.id).toBe('base:muslo-pollo');
    // Lo no corregido no se aprende
    expect(learnedPairs(parseQuickText('arroz', pool))).toEqual([]);
  });
  test('los datos aprendidos se validan al cargar una copia', () => {
    const s = migrate({ textAliases: { pollo: 'base:muslo-pollo', '<script>': 'x', ok: 42 }, actionUses: { texto: 5, raro: 9, escanear: -3 } });
    expect(s.textAliases).toEqual({ pollo: 'base:muslo-pollo' });
    expect(s.actionUses).toEqual({ texto: 5, escanear: 0 });
  });
});

describe('Sugerencia “lo de siempre” flexible', () => {
  const today = '2026-03-04'; // miércoles
  test('reconoce comidas casi iguales', () => {
    const days: Record<string, FoodEntry[]> = {};
    // Café + tostada + aceite, a veces con plátano: no hay dos días idénticos… salvo por el plátano
    days[addDays(today, -1)] = [entry('base:cafe-leche', 200), entry('base:pan-integral', 60), entry('base:aceite-oliva', 10)];
    days[addDays(today, -2)] = [entry('base:cafe-leche', 200), entry('base:pan-integral', 60), entry('base:aceite-oliva', 10), entry('base:platano', 120)];
    days[addDays(today, -3)] = [entry('base:cafe-leche', 200), entry('base:pan-integral', 60), entry('base:platano', 120), entry('base:aceite-oliva', 10)];
    const h = habitualMeal(withDays(days), 'desayuno', today);
    expect(h?.n).toBe(3);
    const s = suggestionsFor(withDays(days), 'desayuno', today);
    expect(s[0].title).toBe('Tu desayuno habitual');
  });
  test('distingue fin de semana cuando hay datos', () => {
    const days: Record<string, FoodEntry[]> = {};
    const sat = '2026-03-07';
    // Laborables: café + tostada. Fines de semana: churros + chocolate
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06']) days[d] = [entry('base:cafe-leche', 200), entry('base:pan-integral', 60)];
    for (const d of ['2026-02-28', '2026-03-01', '2026-02-21', '2026-02-22']) days[d] = [entry('base:churros', 100), entry('base:batido-chocolate', 200)];
    const st = withDays(days);
    expect(st.days[habitualMeal(st, 'desayuno', sat)!.day].entries[0].foodId).toBe('base:churros');
    expect(st.days[habitualMeal(st, 'desayuno', '2026-03-09')!.day].entries[0].foodId).toBe('base:cafe-leche');
  });
  test('una sola vez no es costumbre', () => {
    expect(habitualMeal(withDays({ [addDays(today, -1)]: [entry('base:huevo', 110)] }), 'desayuno', today)).toBeNull();
  });
});
