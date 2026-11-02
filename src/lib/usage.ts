import type { AppState } from '../types';

// ─────────────── Lo que sueles comer ───────────────
// Se calcula a partir del propio diario (no se guarda aparte): así funciona
// desde el primer día con los datos que ya tienes y nunca se desincroniza.

export interface FoodUsage {
  /** Veces que lo has registrado */
  uses: number;
  /** Últimas cantidades (g/ml), de la más reciente a la más antigua (máx. 10) */
  amounts: number[];
  lastDate: string;
}

export type UsageMap = Map<string, FoodUsage>;

export function buildUsage(days: AppState['days']): UsageMap {
  const map: UsageMap = new Map();
  // De más reciente a más antiguo, para que `amounts` quede ordenado
  const dates = Object.keys(days).sort().reverse();
  for (const date of dates) {
    const entries = [...days[date].entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const e of entries) {
      if (!e.foodId || e.unit === 'kcal' || !(e.amount > 0)) continue;
      const u = map.get(e.foodId);
      if (u) {
        u.uses++;
        if (u.amounts.length < 10) u.amounts.push(e.amount);
      } else {
        map.set(e.foodId, { uses: 1, amounts: [e.amount], lastDate: date });
      }
    }
  }
  return map;
}

/**
 * Tu cantidad habitual: la que más repites entre las últimas 10 veces (si
 * alguna se repite), o la última. Redondeo a 5 g para que pequeñas
 * diferencias (148 g, 150 g, 152 g) cuenten como la misma cantidad.
 */
export function habitualAmount(u: FoodUsage | undefined): number | undefined {
  if (!u || !u.amounts.length) return undefined;
  const round = (v: number) => (v >= 20 ? Math.round(v / 5) * 5 : Math.round(v));
  const counts = new Map<number, number>();
  for (const a of u.amounts) counts.set(round(a), (counts.get(round(a)) ?? 0) + 1);
  let best = round(u.amounts[0]);
  let bestN = counts.get(best) ?? 1;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best > 0 ? best : undefined;
}
