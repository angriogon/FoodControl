import type { AppState, Profile } from '../types';

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
      equipped: { color: 'natural', hat: 'none', face: 'none', neck: 'none', body: 'none', hand: 'none', scene: 'prado' },
      purchased: []
    },
    ui: { textSize: 'auto', theme: 'light', highContrast: false },
    achievements: {},
    gemsSpent: 0,
    createdAt: new Date().toISOString()
  };
}

/**
 * Rellena con valores por defecto cualquier campo que falte. Así una copia
 * antigua (o de una versión futura con menos campos) nunca rompe la app.
 */
export function migrate(input: Partial<AppState>): AppState {
  const base = defaultState();
  const profile = { ...base.profile, ...(input.profile ?? {}) };
  profile.macroSplit = { ...base.profile.macroSplit, ...(input.profile?.macroSplit ?? {}) };
  profile.mealSplit = { ...base.profile.mealSplit, ...(input.profile?.mealSplit ?? {}) };
  const days: AppState['days'] = {};
  for (const [k, d] of Object.entries(input.days ?? {})) {
    days[k] = {
      entries: Array.isArray(d?.entries) ? d.entries : [],
      activities: Array.isArray(d?.activities) ? d.activities : [],
      waterMl: Number(d?.waterMl) || 0,
      note: typeof d?.note === 'string' ? d.note : ''
    };
  }
  return {
    ...base,
    ...input,
    version: 1,
    profile,
    days,
    weights: Array.isArray(input.weights) ? [...input.weights].sort((a, b) => a.date.localeCompare(b.date)) : [],
    customFoods: Array.isArray(input.customFoods) ? input.customFoods : [],
    recentFoods: Array.isArray(input.recentFoods) ? input.recentFoods : [],
    pet: {
      ...base.pet,
      ...(input.pet ?? {}),
      equipped: migrateEquipped({ ...base.pet.equipped, ...(input.pet?.equipped ?? {}) }),
      purchased: input.pet?.purchased ?? []
    },
    ui: { ...base.ui, ...(input.ui ?? {}) },
    achievements: input.achievements ?? {},
    gemsSpent: Number(input.gemsSpent) || 0
  };
}

/** v1.0 usaba 'verde' como color base; ahora cada especie tiene su color 'natural'. */
function migrateEquipped(e: AppState['pet']['equipped']): AppState['pet']['equipped'] {
  return { ...e, color: e.color === 'verde' ? 'natural' : e.color };
}
