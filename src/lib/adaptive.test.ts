import { describe, expect, it } from 'vitest';
import type { AppState, DayLog, FoodEntry, MealId } from '../types';
import { defaultState } from '../store/defaults';
import { addDays } from './dates';
import { ADAPTIVE, evaluateAdaptive, isCompleteDay, shouldRunAdaptive } from './adaptive';
import { bmr, calorieTarget, tdee as formulaTdee } from './nutrition';
import { regression, trendSeries, weightInsight } from './trend';

const TODAY = '2026-12-31';
const MEALS: MealId[] = ['desayuno', 'comida', 'cena', 'snacks'];

function entry(meal: MealId, kcal: number, i: number): FoodEntry {
  return {
    id: `${meal}-${i}`, meal, name: meal, amount: 100, unit: 'g', createdAt: '',
    nutrients: { kcal, protein: kcal * 0.075, carbs: kcal * 0.1, fat: kcal * 0.033, fiber: 0 }
  };
}

function day(kcal: number, meals = 3, exercise = 0, incomplete = false): DayLog {
  const ms = MEALS.slice(0, meals);
  return {
    entries: ms.map((m, i) => entry(m, kcal / meals, i)),
    activities: exercise ? [{ id: 'a', activityId: 'x', name: 'x', minutes: 30, kcal: exercise, createdAt: '' }] : [],
    waterMl: 0,
    note: '',
    incomplete: incomplete || undefined
  };
}

/**
 * Persona simulada: gasto real `trueTdee` (sin ejercicio), come `intake` y
 * hace `exercise` kcal de ejercicio registrado al día. Se pesa una vez por semana.
 */
function simulate(opts: { trueTdee: number; intake: number; exercise?: number; days: number; startKg?: number; noise?: number }): AppState {
  const s = defaultState();
  s.profile = { ...s.profile, onboarded: true, sex: 'hombre', birthYear: 1990, heightCm: 178, activityLevel: 'ligero', goal: 'perder', weeklyRateKg: 0.5, startWeightKg: opts.startKg ?? 97 };
  const ex = opts.exercise ?? 0;
  const dailyKg = (opts.intake - opts.trueTdee - ex) / ADAPTIVE.kcalPerKg;
  let kg = opts.startKg ?? 97;
  for (let i = opts.days; i >= 1; i--) {
    const d = addDays(TODAY, -i);
    s.days[d] = day(opts.intake, 3, ex);
    kg += dailyKg;
    if (i % 7 === 0) {
      const noise = opts.noise ? ((i * 37) % 11 - 5) / 5 * opts.noise : 0; // ruido determinista ±noise
      s.weights.push({ date: d, kg: Math.round((kg + noise) * 10) / 10 });
    }
  }
  return s;
}

const lastKg = (s: AppState) => s.weights[s.weights.length - 1].kg;

describe('días completos', () => {
  it('exige 3 comidas, la mitad del objetivo y no estar marcado como incompleto', () => {
    expect(isCompleteDay(day(1800, 3), 2000)).toBe(true);
    expect(isCompleteDay(day(1800, 2), 2000)).toBe(false); // olvidó una comida
    expect(isCompleteDay(day(800, 3), 2000)).toBe(false); // claramente sin registrar todo
    expect(isCompleteDay(day(1800, 3, 0, true), 2000)).toBe(false); // marcado por el usuario
    expect(isCompleteDay(undefined, 2000)).toBe(false);
  });
});

describe('objetivo adaptativo', () => {
  it('no hace nada sin datos suficientes y explica qué falta', () => {
    const s = simulate({ trueTdee: 2500, intake: 2000, days: 10 });
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join(' ')).toMatch(/días completos|pesajes/);
  });

  it('con pesaje semanal estima un gasto real coherente con los datos', () => {
    const s = simulate({ trueTdee: 2500, intake: 2000, days: 35 });
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // El redondeo a 0,1 kg de la báscula introduce algo de error
      expect(Math.abs(r.check.observedTdee - 2500)).toBeLessThan(120);
      expect(r.check.ratePerWeek).toBeLessThan(0);
    }
  });

  it('nunca cambia más de 150 kcal en una revisión', () => {
    const s = simulate({ trueTdee: 3200, intake: 2000, days: 35 });
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(Math.abs(r.check.tdee - r.check.prevTdee)).toBeLessThanOrEqual(ADAPTIVE.maxStepKcal);
  });

  it('converge al gasto real en revisiones semanales sucesivas (con ruido en la báscula)', () => {
    // Gasto real 400 kcal por encima de lo que dice la fórmula
    const base = simulate({ trueTdee: 2500, intake: 2000, days: 35 });
    const formula = Math.round(formulaTdee(base.profile, lastKg(base)));
    const real = formula + 400;
    const s = simulate({ trueTdee: real, intake: real - 500, days: 35, noise: 0.4 });
    for (let week = 0; week < 10; week++) {
      const r = evaluateAdaptive(s, TODAY, lastKg(s));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(Math.abs(r.check.tdee - r.check.prevTdee)).toBeLessThanOrEqual(ADAPTIVE.maxStepKcal); // cada semana: ±150 como mucho
      s.adaptive.tdee = r.check.tdee;
    }
    expect(Math.abs(s.adaptive.tdee! - real)).toBeLessThan(120); // tras 10 semanas, cerca del real
  });

  it('no cuenta dos veces el ejercicio registrado', () => {
    // Mismo gasto base (2400) con 300 kcal de ejercicio y comiendo 300 kcal más
    const s = simulate({ trueTdee: 2400, intake: 2200, exercise: 300, days: 35 });
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(true);
    if (r.ok) expect(Math.abs(r.check.observedTdee - 2400)).toBeLessThan(120);
  });

  it('ignora los días marcados como incompletos', () => {
    const s = simulate({ trueTdee: 2500, intake: 2000, days: 35 });
    // 25 días “registrados a medias”: con 2 comidas no cuentan
    for (let i = 1; i <= 25; i++) s.days[addDays(TODAY, -i)] = day(900, 2);
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(false);
  });

  it('rechaza datos incoherentes (gasto por debajo del metabolismo basal)', () => {
    // Come “1.400” según el registro pero sube de peso: faltan comidas por apuntar
    const s = simulate({ trueTdee: 1000, intake: 1400, days: 35 });
    const r = evaluateAdaptive(s, TODAY, lastKg(s));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatch(/no cuadran/);
  });

  it('respeta los mínimos de seguridad del objetivo', () => {
    const s = simulate({ trueTdee: 2500, intake: 2000, days: 35 });
    const w = lastKg(s);
    const target = calorieTarget(s.profile, w, 1300); // gasto muy bajo
    expect(target).toBeGreaterThanOrEqual(Math.max(1500, Math.round(bmr(s.profile, w))));
  });

  it('se revisa una vez por semana, también tras deshacer, y se pausa con objetivo manual', () => {
    const s = simulate({ trueTdee: 2500, intake: 2000, days: 35 });
    expect(shouldRunAdaptive(s, TODAY)).toBe(true);
    s.adaptive.history.push({ date: TODAY, applied: true, undone: true, observedTdee: 0, tdee: 0, prevTdee: 0, target: 0, prevTarget: 0, avgIntake: 0, ratePerWeek: 0, completeDays: 0, weighIns: 0 });
    expect(shouldRunAdaptive(s, addDays(TODAY, 3))).toBe(false);
    expect(shouldRunAdaptive(s, addDays(TODAY, 7))).toBe(true);
    s.profile.kcalOverride = 1800;
    expect(shouldRunAdaptive(s, addDays(TODAY, 7))).toBe(false);
    s.profile.kcalOverride = undefined;
    s.adaptive.enabled = false;
    expect(shouldRunAdaptive(s, addDays(TODAY, 7))).toBe(false);
  });
});

describe('tendencia de peso', () => {
  it('la recta de regresión recupera el ritmo real', () => {
    const w = [0, 7, 14, 21, 28].map((d, i) => ({ date: addDays('2026-01-01', d), kg: 100 - i * 0.5 }));
    expect(regression(w)!.slope * 7).toBeCloseTo(-0.5, 5);
  });

  it('la tendencia suaviza un pico de retención de líquidos', () => {
    const w = [
      { date: '2026-01-01', kg: 90 }, { date: '2026-01-02', kg: 89.9 }, { date: '2026-01-03', kg: 91.4 }, { date: '2026-01-04', kg: 89.8 }
    ];
    const t = trendSeries(w);
    expect(t[2].trend).toBeLessThan(90.2); // el pico de +1,5 kg apenas mueve la tendencia
  });

  it('proyecta la fecha de objetivo solo si el ritmo va en la dirección correcta', () => {
    const down = [0, 7, 14, 21, 28].map((d, i) => ({ date: addDays('2026-12-01', d), kg: 97 - i * 0.5 }));
    expect(weightInsight(down, 75, '2026-12-29').projection).not.toBeNull();
    const up = down.map((w, i) => ({ ...w, kg: 97 + i * 0.5 }));
    expect(weightInsight(up, 75, '2026-12-29').projection).toBeNull();
  });
});
