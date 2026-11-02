// ───────────────────────── Modelo de datos ─────────────────────────
// Todo el estado de la app vive en un único documento (AppState) que se
// guarda en IndexedDB. Es pequeño (KB) y así la copia de seguridad es
// simplemente exportar este JSON.

export type MealId = 'desayuno' | 'comida' | 'cena' | 'snacks';
export type Sex = 'hombre' | 'mujer';
export type Goal = 'perder' | 'mantener' | 'ganar';
export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'alto' | 'muy_alto';

/** Valores nutricionales por 100 g / 100 ml */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  satFat?: number;
  salt?: number;
}

/** 'A' (muy saludable) … 'E' (poco saludable), estilo Nutri-Score */
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Food {
  id: string;
  name: string;
  brand?: string;
  unit: 'g' | 'ml';
  per100: Nutrients;
  /** Ración típica, p.ej. { label: '1 huevo', grams: 55 } */
  serving?: { label: string; grams: number };
  grade?: QualityGrade;
  source: 'base' | 'custom' | 'off';
  emoji?: string;
}

export interface FoodEntry {
  id: string;
  meal: MealId;
  foodId?: string;
  name: string;
  /** Cantidad en g/ml (0 si es un “añadido rápido” sin peso) */
  amount: number;
  unit: 'g' | 'ml' | 'kcal';
  nutrients: Nutrients; // ya calculados para la cantidad consumida
  grade?: QualityGrade;
  emoji?: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  activityId: string;
  name: string;
  minutes: number;
  kcal: number;
  emoji?: string;
  createdAt: string;
}

export interface DayLog {
  entries: FoodEntry[];
  activities: ActivityEntry[];
  waterMl: number;
  note: string;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface MacroSplit {
  protein: number; // % de kcal
  carbs: number;
  fat: number;
}

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** kg/semana objetivo (0.25 – 1) cuando se pierde o gana peso */
  weeklyRateKg: number;
  startWeightKg: number;
  goalWeightKg: number;
  /** Si se define, sustituye al objetivo calculado */
  kcalOverride?: number;
  macroSplit: MacroSplit;
  fiberG: number;
  waterGoalMl: number;
  glassMl: number;
  /** Sumar las kcal quemadas haciendo ejercicio a las disponibles */
  addExerciseKcal: boolean;
  mealSplit: Record<MealId, number>; // % del objetivo diario
  onboarded: boolean;
}

export type Species = 'brote' | 'gato' | 'panda' | 'pollito' | 'conejo' | 'dino';

export interface Equipped {
  color: string;
  hat: string;
  face: string;
  neck: string;
  body: string;
  hand: string;
  /** Compañero que acompaña a la mascota */
  pal: string;
  scene: string;
}

export interface PetState {
  species: Species;
  name: string;
  equipped: Equipped;
  /** Artículos comprados con gemas */
  purchased: string[];
}

export interface AppState {
  version: 1;
  profile: Profile;
  days: Record<string, DayLog>;
  weights: WeightEntry[];
  customFoods: Food[];
  /** Alimentos usados recientemente (más reciente primero, máx. 40) */
  recentFoods: Food[];
  pet: PetState;
  /** id del logro → fecha ISO de desbloqueo */
  achievements: Record<string, string>;
  /** Gemas gastadas en la tienda de la mascota */
  gemsSpent: number;
  ui: UiSettings;
  lastBackupAt?: string;
  createdAt: string;
}

/** Ajustes de accesibilidad y apariencia */
export interface UiSettings {
  /** 'auto' sigue el tamaño de texto de Ajustes de iOS (Dynamic Type) */
  textSize: 'auto' | 'm' | 'l' | 'xl';
  theme: 'auto' | 'light' | 'dark';
  /** Contraste aumentado: textos secundarios más oscuros y bordes visibles */
  highContrast: boolean;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  meals: Record<MealId, number>;
}
