import type {
  ActivityEntry, AppState, Equipped, Food, FoodEntry, MealId, Nutrients, Profile, QualityGrade, Species, WeightEntry
} from '../types';
import { PET_ITEMS } from '../lib/pet';

export function defaultProfile(): Profile {
  return {
    name: '',
    sex: 'mujer',
    birthYear: new Date().getFullYear() - 35,
    heightCm: 168,
    activityLevel: 'ligero',
    goal: 'perder',
    weeklyRateKg: 0.5,
    startWeightKg: 75,
    goalWeightKg: 68,
    macroSplit: { protein: 30, carbs: 40, fat: 30 },
    fiberG: 25,
    waterGoalMl: 2000,
    glassMl: 250,
    addExerciseKcal: true,
    mealSplit: { desayuno: 25, comida: 35, cena: 30, snacks: 10 },
    onboarded: false
  };
}

export function defaultState(): AppState {
  return {
    version: 1,
    profile: defaultProfile(),
    days: {},
    weights: [],
    customFoods: [],
    recentFoods: [],
    pet: {
      species: 'brote',
      name: 'Brotín',
      equipped: { color: 'natural', hat: 'none', face: 'none', neck: 'none', body: 'none', hand: 'none', pal: 'none', scene: 'prado' },
      purchased: []
    },
    ui: { textSize: 'auto', theme: 'light', highContrast: false },
    achievements: {},
    gemsSpent: 0,
    createdAt: new Date().toISOString()
  };
}

// ───────────────────────── Validación de datos ─────────────────────────
// Todo lo que entra desde una copia de seguridad (o desde un almacenamiento
// dañado) se trata como NO FIABLE: se comprueba tipo, rango y valores
// permitidos campo a campo. Un dato raro se sustituye por su valor por
// defecto o se descarta, en vez de llegar a la interfaz y romperla.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const own = (o: Obj, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function num(v: unknown, def: number, min = -Infinity, max = Infinity): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}
function str(v: unknown, def = '', maxLen = 200): string {
  return typeof v === 'string' ? v.slice(0, maxLen) : def;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], def: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : def;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE_RE.test(v);

const MEALS: MealId[] = ['desayuno', 'comida', 'cena', 'snacks'];
const GRADES: QualityGrade[] = ['A', 'B', 'C', 'D', 'E'];
const SPECIES_IDS: Species[] = ['brote', 'gato', 'panda', 'pollito', 'conejo', 'dino'];

function nutrients(v: unknown): Nutrients {
  const o = isObj(v) ? v : {};
  const n = (k: string) => num(o[k], 0, 0, 100000);
  return { kcal: n('kcal'), protein: n('protein'), carbs: n('carbs'), fat: n('fat'), fiber: n('fiber'), sugar: n('sugar'), satFat: n('satFat'), salt: n('salt') };
}

function grade(v: unknown): QualityGrade | undefined {
  return typeof v === 'string' && (GRADES as string[]).includes(v) ? (v as QualityGrade) : undefined;
}

function food(v: unknown): Food | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  const serving = isObj(v.serving) && num(v.serving.grams, 0) > 0
    ? { label: str(v.serving.label, '1 ración', 60), grams: num(v.serving.grams, 100, 0.1, 10000) }
    : undefined;
  return {
    id: str(v.id, '', 120),
    name: str(v.name, '', 120),
    brand: typeof v.brand === 'string' ? str(v.brand, '', 80) : undefined,
    unit: v.unit === 'ml' ? 'ml' : 'g',
    per100: nutrients(v.per100),
    serving,
    grade: grade(v.grade),
    source: oneOf(v.source, ['base', 'custom', 'off'] as const, 'custom'),
    emoji: typeof v.emoji === 'string' ? str(v.emoji, '', 16) : undefined
  };
}

function entry(v: unknown): FoodEntry | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  return {
    id: str(v.id, '', 120),
    meal: oneOf(v.meal, MEALS, 'snacks'),
    foodId: typeof v.foodId === 'string' ? str(v.foodId, '', 120) : undefined,
    name: str(v.name, 'Alimento', 160),
    amount: num(v.amount, 0, 0, 100000),
    unit: oneOf(v.unit, ['g', 'ml', 'kcal'] as const, 'g'),
    nutrients: nutrients(v.nutrients),
    grade: grade(v.grade),
    emoji: typeof v.emoji === 'string' ? str(v.emoji, '', 16) : undefined,
    createdAt: str(v.createdAt, new Date().toISOString(), 40)
  };
}

function activity(v: unknown): ActivityEntry | null {
  if (!isObj(v) || typeof v.id !== 'string') return null;
  return {
    id: str(v.id, '', 120),
    activityId: str(v.activityId, 'custom', 60),
    name: str(v.name, 'Actividad', 120),
    minutes: num(v.minutes, 0, 0, 1440),
    kcal: num(v.kcal, 0, 0, 10000),
    emoji: typeof v.emoji === 'string' ? str(v.emoji, '', 16) : undefined,
    createdAt: str(v.createdAt, new Date().toISOString(), 40)
  };
}

const list = <T,>(v: unknown, fn: (x: unknown) => T | null, max: number): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(fn).filter((x): x is T => x !== null) : [];

function profileFrom(v: unknown): Profile {
  const b = defaultProfile();
  const o = isObj(v) ? v : {};
  const ms = isObj(o.macroSplit) ? o.macroSplit : {};
  const meals = isObj(o.mealSplit) ? o.mealSplit : {};
  const year = new Date().getFullYear();
  return {
    name: str(o.name, b.name, 40),
    sex: oneOf(o.sex, ['hombre', 'mujer'] as const, b.sex),
    birthYear: Math.round(num(o.birthYear, b.birthYear, 1900, year)),
    heightCm: num(o.heightCm, b.heightCm, 80, 260),
    activityLevel: oneOf(o.activityLevel, ['sedentario', 'ligero', 'moderado', 'alto', 'muy_alto'] as const, b.activityLevel),
    goal: oneOf(o.goal, ['perder', 'mantener', 'ganar'] as const, b.goal),
    weeklyRateKg: num(o.weeklyRateKg, b.weeklyRateKg, 0, 1.5),
    startWeightKg: num(o.startWeightKg, b.startWeightKg, 20, 500),
    goalWeightKg: num(o.goalWeightKg, b.goalWeightKg, 20, 500),
    kcalOverride: o.kcalOverride == null ? undefined : num(o.kcalOverride, 0, 0, 10000) || undefined,
    macroSplit: {
      protein: num(ms.protein, b.macroSplit.protein, 0, 100),
      carbs: num(ms.carbs, b.macroSplit.carbs, 0, 100),
      fat: num(ms.fat, b.macroSplit.fat, 0, 100)
    },
    fiberG: num(o.fiberG, b.fiberG, 0, 200),
    waterGoalMl: num(o.waterGoalMl, b.waterGoalMl, 250, 10000),
    glassMl: num(o.glassMl, b.glassMl, 50, 2000),
    addExerciseKcal: typeof o.addExerciseKcal === 'boolean' ? o.addExerciseKcal : b.addExerciseKcal,
    mealSplit: {
      desayuno: num(meals.desayuno, b.mealSplit.desayuno, 0, 100),
      comida: num(meals.comida, b.mealSplit.comida, 0, 100),
      cena: num(meals.cena, b.mealSplit.cena, 0, 100),
      snacks: num(meals.snacks, b.mealSplit.snacks, 0, 100)
    },
    onboarded: o.onboarded === true
  };
}

function equippedFrom(v: unknown, base: Equipped): Equipped {
  const o = isObj(v) ? v : {};
  const out = { ...base };
  for (const slot of Object.keys(base) as (keyof Equipped)[]) {
    let val = o[slot];
    if (slot === 'color' && val === 'verde') val = 'natural'; // v1.0
    // Solo se aceptan artículos que existen en el catálogo
    if (typeof val === 'string' && PET_ITEMS.some((i) => i.id === `${slot}:${val}`)) out[slot] = val;
  }
  return out;
}

/**
 * Convierte cualquier entrada (copia de seguridad, datos antiguos o dañados)
 * en un estado válido. Nunca lanza excepciones.
 */
export function migrate(input: unknown): AppState {
  const base = defaultState();
  const o = isObj(input) ? input : {};

  const days: AppState['days'] = {};
  if (isObj(o.days)) {
    for (const k of Object.keys(o.days).slice(0, 20000)) {
      const d = o.days[k];
      if (!isDate(k) || !isObj(d)) continue;
      days[k] = {
        entries: list(d.entries, entry, 300),
        activities: list(d.activities, activity, 100),
        waterMl: num(d.waterMl, 0, 0, 20000),
        note: str(d.note, '', 5000)
      };
    }
  }

  const weights: WeightEntry[] = Array.isArray(o.weights)
    ? o.weights
        .filter((w): w is Obj => isObj(w) && isDate(w.date))
        .map((w) => ({ date: w.date as string, kg: num(w.kg, NaN, 20, 500) }))
        .filter((w) => Number.isFinite(w.kg))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const pet = isObj(o.pet) ? o.pet : {};
  const ui = isObj(o.ui) ? o.ui : {};
  const achievements: Record<string, string> = {};
  if (isObj(o.achievements)) {
    for (const k of Object.keys(o.achievements).slice(0, 500)) {
      const v = o.achievements[k];
      if (/^[a-z0-9-]{1,40}$/.test(k) && typeof v === 'string' && own(o.achievements, k)) achievements[k] = v.slice(0, 40);
    }
  }
  const validIds = new Set(PET_ITEMS.map((i) => i.id));

  return {
    version: 1,
    profile: profileFrom(o.profile),
    days,
    weights,
    customFoods: list(o.customFoods, food, 2000),
    recentFoods: list(o.recentFoods, food, 40),
    pet: {
      species: oneOf(pet.species, SPECIES_IDS, base.pet.species),
      name: str(pet.name, base.pet.name, 20) || base.pet.name,
      equipped: equippedFrom(pet.equipped, base.pet.equipped),
      purchased: Array.isArray(pet.purchased) ? [...new Set(pet.purchased.filter((x): x is string => typeof x === 'string' && validIds.has(x)))] : []
    },
    ui: {
      textSize: oneOf(ui.textSize, ['auto', 'm', 'l', 'xl'] as const, base.ui.textSize),
      theme: oneOf(ui.theme, ['auto', 'light', 'dark'] as const, base.ui.theme),
      highContrast: ui.highContrast === true
    },
    achievements,
    gemsSpent: num(o.gemsSpent, 0, 0, 1e9),
    lastBackupAt: typeof o.lastBackupAt === 'string' ? o.lastBackupAt.slice(0, 40) : undefined,
    createdAt: str(o.createdAt, base.createdAt, 40)
  };
}
