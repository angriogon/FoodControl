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
  source: 'base' | 'custom' | 'off' | 'recipe';
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
  /** Si se añadió como parte de un menú: id del grupo y nombre del menú */
  groupId?: string;
  groupName?: string;
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
  /** El usuario indica que no registró todo: no cuenta para el objetivo adaptativo */
  incomplete?: boolean;
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

// ───────────── Recetario ─────────────

/** Ingrediente de un plato o elemento de un menú: alimento + cantidad en g/ml */
export interface Portion {
  food: Food;
  amount: number;
}

/** Plato o receta: varios ingredientes que se cocinan juntos y se reparten en raciones */
export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  servings: number;
  ingredients: Portion[];
  /** Peso total cocinado (g). Si se indica, se puede registrar por gramos servidos */
  cookedWeightG?: number;
  tags: string[];
  createdAt: string;
}

/** Menú: comida completa que se añade de un toque (alimentos y/o platos) */
export interface Menu {
  id: string;
  name: string;
  emoji: string;
  /** Comida a la que se añade por defecto */
  meal: MealId;
  items: Portion[];
  createdAt: string;
  /** Veces que se ha usado (para ordenar por uso) */
  uses: number;
}

// ───────────── Objetivo adaptativo ─────────────

/** Una revisión semanal del gasto real */
export interface AdaptiveCheck {
  date: string; // YYYY-MM-DD
  applied: boolean;
  /** Gasto calculado con tus datos de este periodo (sin el ejercicio registrado) */
  observedTdee: number;
  /** Gasto usado a partir de ahora (suavizado y limitado) */
  tdee: number;
  prevTdee: number;
  target: number;
  prevTarget: number;
  avgIntake: number;
  /** kg/semana según la tendencia (negativo = bajando) */
  ratePerWeek: number;
  completeDays: number;
  weighIns: number;
  /** El usuario deshizo este ajuste */
  undone?: boolean;
}

export interface AdaptiveState {
  enabled: boolean;
  /** Gasto diario estimado vigente (sin ejercicio registrado). Vacío = se usa la fórmula */
  tdee?: number;
  history: AdaptiveCheck[];
}

export interface AppState {
  version: 1;
  profile: Profile;
  days: Record<string, DayLog>;
  weights: WeightEntry[];
  customFoods: Food[];
  /** Alimentos usados recientemente (más reciente primero, máx. 40) */
  recentFoods: Food[];
  recipes: Recipe[];
  menus: Menu[];
  adaptive: AdaptiveState;
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
