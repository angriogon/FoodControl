import type { AdaptiveCheck, AppState, DayLog } from '../types';
import { addDays, diffDays } from './dates';
import { bmr, burnedKcal, calorieTarget, dayTotals, tdee as formulaTdee } from './nutrition';
import { regression } from './trend';

// ─────────────── Objetivo calórico adaptativo ───────────────
// Balance energético con tus propios datos:
//   gasto real = lo que comes de media − (cambio de peso × 7.700 kcal/kg)
// Si comes 1.900 kcal y bajas 0,4 kg/semana, gastas ≈ 1.900 + 0,4×7.700/7 ≈ 2.340 kcal/día.
// Se aplica solo una vez por semana, suavizado y con límites de seguridad.

export const ADAPTIVE = {
  windowDays: 35, // 5 semanas: con pesaje semanal da 5 pesajes
  minCompleteDays: 14,
  minWeighIns: 4,
  minSpanDays: 21,
  maxStepKcal: 150, // cambio máximo por semana
  blend: 0.5, // cuánto se acerca la estimación al dato observado cada vez
  cadenceDays: 7,
  kcalPerKg: 7700
} as const;

/** Día válido para el cálculo: 3+ comidas, al menos la mitad del objetivo y no marcado como incompleto */
export function isCompleteDay(day: DayLog | undefined, target: number): boolean {
  if (!day || day.incomplete) return false;
  const meals = new Set(day.entries.map((e) => e.meal)).size;
  return meals >= 3 && dayTotals(day).kcal >= target * 0.5;
}

export interface AdaptiveProgress {
  completeDays: number;
  weighIns: number;
  spanDays: number;
}

export type AdaptiveResult =
  | { ok: true; check: AdaptiveCheck; progress: AdaptiveProgress }
  | { ok: false; reasons: string[]; progress: AdaptiveProgress };

export function currentTdee(state: AppState, weightKg: number): number {
  return state.adaptive.tdee ?? Math.round(formulaTdee(state.profile, weightKg));
}

export function evaluateAdaptive(state: AppState, today: string, weightKg: number): AdaptiveResult {
  const { profile } = state;
  const from = addDays(today, -ADAPTIVE.windowDays);
  const prevTdee = currentTdee(state, weightKg);
  const prevTarget = calorieTarget(profile, weightKg, prevTdee);

  // Ingesta media en días completos (hoy no cuenta: aún no ha terminado)
  let intake = 0;
  let exercise = 0;
  let completeDays = 0;
  for (let d = from; d < today; d = addDays(d, 1)) {
    const day = state.days[d];
    if (!isCompleteDay(day, prevTarget)) continue;
    completeDays++;
    intake += dayTotals(day).kcal;
    exercise += burnedKcal(day);
  }

  const weights = state.weights.filter((w) => w.date >= from && w.date <= today);
  const reg = regression(weights);
  const progress: AdaptiveProgress = { completeDays, weighIns: weights.length, spanDays: reg?.spanDays ?? 0 };

  const reasons: string[] = [];
  if (completeDays < ADAPTIVE.minCompleteDays) {
    reasons.push(`Faltan ${ADAPTIVE.minCompleteDays - completeDays} días completos (3 comidas o más) en las últimas 5 semanas`);
  }
  if (weights.length < ADAPTIVE.minWeighIns) {
    reasons.push(`Faltan ${ADAPTIVE.minWeighIns - weights.length} pesajes en las últimas 5 semanas`);
  } else if (!reg || reg.spanDays < ADAPTIVE.minSpanDays) {
    reasons.push('Los pesajes deben cubrir al menos 3 semanas');
  }
  if (reasons.length || !reg) return { ok: false, reasons, progress };

  const avgIntake = intake / completeDays;
  // El ejercicio registrado se suma aparte al margen del día: se descuenta para no contarlo dos veces
  const avgExercise = profile.addExerciseKcal ? exercise / completeDays : 0;
  const observedTotal = avgIntake - reg.slope * ADAPTIVE.kcalPerKg;
  const observed = observedTotal - avgExercise;

  // Coherencia: un gasto por debajo del metabolismo basal suele indicar días sin registrar
  const basal = bmr(profile, weightKg);
  if (observed < basal * 0.95 || observed > basal * 2.6) {
    return {
      ok: false,
      reasons: ['Los datos de este periodo no cuadran (¿comidas sin registrar?). Marca esos días como incompletos en el Diario.'],
      progress
    };
  }

  const blended = prevTdee + ADAPTIVE.blend * (observed - prevTdee);
  const step = Math.max(-ADAPTIVE.maxStepKcal, Math.min(ADAPTIVE.maxStepKcal, blended - prevTdee));
  const newTdee = Math.round(prevTdee + step);

  return {
    ok: true,
    progress,
    check: {
      date: today,
      applied: true,
      observedTdee: Math.round(observed),
      tdee: newTdee,
      prevTdee,
      target: calorieTarget(profile, weightKg, newTdee),
      prevTarget,
      avgIntake: Math.round(avgIntake),
      ratePerWeek: Math.round(reg.slope * 7 * 100) / 100,
      completeDays,
      weighIns: weights.length
    }
  };
}

/** ¿Toca revisar hoy? Una vez por semana desde el último ajuste, si está activo y sin objetivo manual */
export function shouldRunAdaptive(state: AppState, today: string): boolean {
  if (!state.adaptive.enabled || (state.profile.kcalOverride ?? 0) > 0 || !state.profile.onboarded) return false;
  // Un ajuste deshecho también cuenta: no se vuelve a proponer hasta la semana siguiente
  const lastApplied = [...state.adaptive.history].reverse().find((h) => h.applied);
  return !lastApplied || diffDays(today, lastApplied.date) >= ADAPTIVE.cadenceDays;
}
