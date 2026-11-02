// Fechas en hora LOCAL. Usar toISOString() daría el día UTC y, a partir de
// medianoche en España, los registros caerían en el día equivocado.

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000);
}

const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const fmtWeekday = new Intl.DateTimeFormat('es-ES', { weekday: 'narrow' });

export function dayLabel(key: string): string {
  const diff = diffDays(key, todayKey());
  if (diff === 0) return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1) return 'Mañana';
  const s = fmtLong.format(fromKey(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function longDate(key: string): string {
  return fmtLong.format(fromKey(key));
}

export function shortDate(key: string): string {
  return fmtShort.format(fromKey(key));
}

export function weekdayLetter(key: string): string {
  return fmtWeekday.format(fromKey(key)).toUpperCase();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
