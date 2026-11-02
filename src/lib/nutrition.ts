import type {
  ActivityLevel,
  DayLog,
  Food,
  FoodEntry,
  MealId,
  Nutrients,
  Profile,
  QualityGrade,
  Targets
} from '../types';

export const MEALS: { id: MealId; label: string; emoji: string }[] = [
  { id: 'desayuno', label: 'Desayuno', emoji: '🥐' },
  { id: 'comida', label: 'Comida', emoji: '🍲' },
  { id: 'cena', label: 'Cena', emoji: '🥗' },
  { id: 'snacks', label: 'Snacks', emoji: '🍎' }
];

export const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string; hint: string }> = {
  sedentario: { factor: 1.2, label: 'Sedentario', hint: 'Trabajo de oficina, poco movimiento' },
  ligero: { factor: 1.375, label: 'Ligero', hint: 'Caminas o entrenas 1–3 días/semana' },
  moderado: { factor: 1.55, label: 'Moderado', hint: 'Entrenas 3–5 días/semana' },
  alto: { factor: 1.725, label: 'Alto', hint: 'Entrenas 6–7 días/semana' },
  muy_alto: { factor: 1.9, label: 'Muy alto', hint: 'Trabajo físico + entreno diario' }
};

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0 };

export function emptyDay(): DayLog {
  return { entries: [], activities: [], waterMl: 0, note: '' };
}

export function age(profile: Profile): number {
  return new Date().getFullYear() - profile.birthYear;
}

/** Metabolismo basal con Mifflin-St Jeor (la fórmula más fiable en población general). */
export function bmr(profile: Profile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * age(profile);
  return profile.sex === 'hombre' ? base + 5 : base - 161;
}

export function tdee(profile: Profile, weightKg: number): number {
  return bmr(profile, weightKg) * ACTIVITY_FACTORS[profile.activityLevel].factor;
}

/**
 * Objetivo calórico. 1 kg de grasa ≈ 7700 kcal, así que 0,5 kg/semana ≈ 550 kcal/día.
 * Nunca bajamos del metabolismo basal ni de un mínimo seguro (1200/1500).
 */
export function calorieTarget(profile: Profile, weightKg: number, adaptiveTdee?: number): number {
  if (profile.kcalOverride && profile.kcalOverride > 0) return Math.round(profile.kcalOverride);
  // Gasto real estimado con tus datos (objetivo adaptativo) o, si aún no hay, la fórmula
  const maintenance = adaptiveTdee ?? tdee(profile, weightKg);
  const delta = (profile.weeklyRateKg * 7700) / 7;
  let target = maintenance;
  if (profile.goal === 'perder') target = maintenance - delta;
  if (profile.goal === 'ganar') target = maintenance + delta;
  const floor = Math.max(profile.sex === 'hombre' ? 1500 : 1200, profile.goal === 'perder' ? bmr(profile, weightKg) : 0);
  return Math.round(Math.max(target, floor));
}

export function computeTargets(profile: Profile, weightKg: number, adaptiveTdee?: number): Targets {
  const kcal = calorieTarget(profile, weightKg, adaptiveTdee);
  const { protein, carbs, fat } = profile.macroSplit;
  const meals = Object.fromEntries(
    (Object.keys(profile.mealSplit) as MealId[]).map((m) => [m, Math.round((kcal * profile.mealSplit[m]) / 100)])
  ) as Record<MealId, number>;
  return {
    kcal,
    protein: Math.round((kcal * protein) / 100 / 4),
    carbs: Math.round((kcal * carbs) / 100 / 4),
    fat: Math.round((kcal * fat) / 100 / 9),
    fiber: profile.fiberG,
    waterMl: profile.waterGoalMl,
    meals
  };
}

export function scaleNutrients(per100: Nutrients, amount: number): Nutrients {
  const f = amount / 100;
  const r = (v: number | undefined) => Math.round((v ?? 0) * f * 10) / 10;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: r(per100.protein),
    carbs: r(per100.carbs),
    fat: r(per100.fat),
    fiber: r(per100.fiber),
    sugar: r(per100.sugar),
    satFat: r(per100.satFat),
    salt: r(per100.salt)
  };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const t = { ...EMPTY_NUTRIENTS };
  for (const n of list) {
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
    t.fiber += n.fiber;
    t.sugar = (t.sugar ?? 0) + (n.sugar ?? 0);
    t.satFat = (t.satFat ?? 0) + (n.satFat ?? 0);
    t.salt = (t.salt ?? 0) + (n.salt ?? 0);
  }
  return t;
}

export function dayTotals(day: DayLog | undefined): Nutrients {
  return sumNutrients((day?.entries ?? []).map((e) => e.nutrients));
}

export function mealTotals(day: DayLog | undefined, meal: MealId): Nutrients {
  return sumNutrients((day?.entries ?? []).filter((e) => e.meal === meal).map((e) => e.nutrients));
}

export function burnedKcal(day: DayLog | undefined): number {
  return (day?.activities ?? []).reduce((s, a) => s + a.kcal, 0);
}

/**
 * Calidad estimada cuando un alimento no trae Nutri-Score.
 * Premia proteína y fibra por kcal; penaliza azúcar, grasa saturada y sal.
 */
export function estimateGrade(n: Nutrients): QualityGrade {
  const kcal = Math.max(n.kcal, 1);
  let score = 0;
  score += Math.min(4, (n.protein * 4 * 100) / kcal / 6); // % kcal de proteína
  score += Math.min(3, n.fiber / 2);
  score -= Math.min(4, (n.sugar ?? 0) / 6);
  score -= Math.min(3, (n.satFat ?? 0) / 3);
  score -= Math.min(2, (n.salt ?? 0) / 0.75);
  if (n.kcal > 400) score -= 1.5;
  if (n.kcal < 80) score += 1;
  if (score >= 4) return 'A';
  if (score >= 2) return 'B';
  if (score >= 0) return 'C';
  if (score >= -2.5) return 'D';
  return 'E';
}

export function foodGrade(food: Food): QualityGrade {
  return food.grade ?? estimateGrade(food.per100);
}

const GRADE_POINTS: Record<QualityGrade, number> = { A: 100, B: 80, C: 55, D: 30, E: 10 };

/** Puntuación 0-100 de la calidad del día, ponderada por kcal de cada alimento. */
export function dayQuality(entries: FoodEntry[]): number | null {
  const graded = entries.filter((e) => e.grade && e.nutrients.kcal > 0);
  if (!graded.length) return null;
  const total = graded.reduce((s, e) => s + e.nutrients.kcal, 0);
  return Math.round(graded.reduce((s, e) => s + GRADE_POINTS[e.grade!] * e.nutrients.kcal, 0) / total);
}

export function qualityLabel(score: number | null): { label: string; text: string; tone: 'good' | 'ok' | 'bad' | 'none' } {
  if (score == null) return { label: 'Sin datos', text: 'Registra tus comidas para ver la calidad de tu alimentación.', tone: 'none' };
  if (score >= 75) return { label: 'Muy bien', text: 'Tus alimentos son ricos en nutrientes y poco procesados. ¡Sigue así!', tone: 'good' };
  if (score >= 55) return { label: 'Bien', text: 'Tus alimentos son bastante ricos en nutrientes. Hay margen para algo más de verdura o fibra.', tone: 'good' };
  if (score >= 40) return { label: 'Mejorable', text: 'Hay bastantes alimentos procesados o con azúcar. Prueba a cambiar alguno por fruta, verdura o legumbre.', tone: 'ok' };
  return { label: 'A mejorar', text: 'Predominan los alimentos ultraprocesados. Pequeños cambios marcan la diferencia.', tone: 'bad' };
}

export type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber';

export const MACROS: { key: MacroKey; label: string; short: string; color: string; kcalPerG: number }[] = [
  { key: 'fat', label: 'Grasa', short: 'Grasa', color: 'var(--fat)', kcalPerG: 9 },
  { key: 'protein', label: 'Proteínas', short: 'Prot.', color: 'var(--protein)', kcalPerG: 4 },
  { key: 'carbs', label: 'Carbohidratos', short: 'Carbos', color: 'var(--carbs)', kcalPerG: 4 },
  { key: 'fiber', label: 'Fibra', short: 'Fibra', color: 'var(--fiber)', kcalPerG: 2 }
];

export function macroStatus(value: number, target: number, timeOfDayFactor = 1) {
  const ratio = target > 0 ? value / (target * timeOfDayFactor) : 0;
  if (ratio < 0.5) return { label: 'Consumo bajo', tone: 'warn' as const };
  if (ratio < 0.85) return { label: 'Consumo moderado', tone: 'ok' as const };
  if (ratio <= 1.15) return { label: 'En objetivo', tone: 'good' as const };
  return { label: 'Consumo alto', tone: 'warn' as const };
}

export const MACRO_SUGGESTIONS: Record<MacroKey, string[]> = {
  protein: ['Lentejas o garbanzos', 'Atún al natural', 'Queso fresco batido 0%', 'Huevos', 'Pechuga de pollo o pavo'],
  carbs: ['Avena', 'Arroz integral', 'Pan integral', 'Patata cocida', 'Fruta de temporada'],
  fat: ['Aceite de oliva virgen extra', 'Un puñado de nueces', 'Aguacate', 'Salmón o sardinas'],
  fiber: ['Garbanzos', 'Alcachofas', 'Frambuesas', 'Brócoli', 'Semillas de chía']
};

export function round(n: number, d = 0): number {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

export function fmt(n: number, d = 0): string {
  return round(n, d).toLocaleString('es-ES', { maximumFractionDigits: d });
}
