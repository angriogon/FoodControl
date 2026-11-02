import type { WeightEntry } from '../types';
import { addDays, diffDays } from './dates';

// ─────────────── Tendencia de peso ───────────────
// El peso diario oscila ±0,5–1,5 kg por agua, sal o digestión. La tendencia
// filtra ese ruido para ver el cambio real de grasa/masa.

/** Peso que “absorbe” cada día de distancia: 10 %/día (≈52 % con una semana de hueco) */
const DAILY_ALPHA = 0.1;

export interface TrendPoint {
  date: string;
  kg: number;
  trend: number;
}

/**
 * Media móvil exponencial que respeta el tiempo entre pesajes: con pesajes
 * diarios suaviza mucho; con pesajes semanales cada dato pesa más.
 */
export function trendSeries(weights: WeightEntry[]): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const out: TrendPoint[] = [];
  let trend = 0;
  sorted.forEach((w, i) => {
    if (i === 0) trend = w.kg;
    else {
      const days = Math.max(1, diffDays(w.date, sorted[i - 1].date));
      const a = 1 - (1 - DAILY_ALPHA) ** days;
      trend += a * (w.kg - trend);
    }
    out.push({ date: w.date, kg: w.kg, trend: Math.round(trend * 100) / 100 });
  });
  return out;
}

export interface Regression {
  /** kg por día */
  slope: number;
  intercept: number;
  /** días entre el primer y el último pesaje */
  spanDays: number;
  n: number;
}

/** Recta de mínimos cuadrados peso~fecha. Robusta con pesajes espaciados (semanales). */
export function regression(weights: WeightEntry[]): Regression | null {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const x0 = sorted[0].date;
  const xs = sorted.map((w) => diffDays(w.date, x0));
  const ys = sorted.map((w) => w.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx, spanDays: xs[n - 1], n };
}

export interface WeightInsight {
  /** Peso de tendencia actual */
  trendKg: number | null;
  /** kg/semana (negativo = bajando), o null si no hay datos suficientes */
  ratePerWeek: number | null;
  /** Fecha estimada para llegar al objetivo a este ritmo */
  projection: string | null;
  /** Diferencia del último pesaje con su tendencia (ruido de líquidos, etc.) */
  lastVsTrend: number | null;
}

export const RATE_WINDOW_DAYS = 35;

export function weightInsight(weights: WeightEntry[], goalKg: number, today: string): WeightInsight {
  const series = trendSeries(weights);
  if (series.length < 3) {
    return { trendKg: series.length ? series[series.length - 1].kg : null, ratePerWeek: null, projection: null, lastVsTrend: null };
  }
  const last = series[series.length - 1];
  const recent = weights.filter((w) => w.date >= addDays(today, -RATE_WINDOW_DAYS));
  const reg = regression(recent);
  const rate = reg && reg.n >= 3 && reg.spanDays >= 14 ? reg.slope * 7 : null;

  let projection: string | null = null;
  const remaining = goalKg - last.trend;
  if (rate && Math.abs(rate) >= 0.05 && Math.sign(rate) === Math.sign(remaining) && Math.abs(remaining) > 0.3) {
    const weeks = remaining / rate;
    if (weeks > 0 && weeks < 260) projection = addDays(today, Math.round(weeks * 7));
  }
  return {
    trendKg: last.trend,
    ratePerWeek: rate == null ? null : Math.round(rate * 100) / 100,
    projection,
    lastVsTrend: Math.round((last.kg - last.trend) * 10) / 10
  };
}
