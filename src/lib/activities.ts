// Valores MET (Compendium of Physical Activities, 2024).
// kcal ≈ MET × peso (kg) × horas. Es una estimación, no una medida.

export interface ActivityType {
  id: string;
  name: string;
  emoji: string;
  met: number;
}

export const ACTIVITIES: ActivityType[] = [
  { id: 'caminar', name: 'Caminar (ritmo normal)', emoji: '🚶', met: 3.5 },
  { id: 'caminar-rapido', name: 'Caminar rápido', emoji: '🚶', met: 4.8 },
  { id: 'senderismo', name: 'Senderismo', emoji: '🥾', met: 6 },
  { id: 'correr-suave', name: 'Correr suave (8 km/h)', emoji: '🏃', met: 8 },
  { id: 'correr', name: 'Correr (10 km/h)', emoji: '🏃', met: 9.8 },
  { id: 'bici', name: 'Bicicleta (paseo)', emoji: '🚴', met: 6 },
  { id: 'bici-intensa', name: 'Bicicleta / spinning intenso', emoji: '🚴', met: 8.5 },
  { id: 'fuerza', name: 'Pesas / fuerza', emoji: '🏋️', met: 5 },
  { id: 'hiit', name: 'HIIT / crossfit', emoji: '🔥', met: 8 },
  { id: 'natacion', name: 'Natación', emoji: '🏊', met: 7 },
  { id: 'eliptica', name: 'Elíptica', emoji: '⚙️', met: 5 },
  { id: 'yoga', name: 'Yoga / pilates', emoji: '🧘', met: 3 },
  { id: 'padel', name: 'Pádel', emoji: '🎾', met: 6 },
  { id: 'futbol', name: 'Fútbol', emoji: '⚽', met: 7 },
  { id: 'baloncesto', name: 'Baloncesto', emoji: '🏀', met: 6.5 },
  { id: 'baile', name: 'Baile / zumba', emoji: '💃', met: 5.5 },
  { id: 'tareas', name: 'Tareas del hogar', emoji: '🧹', met: 3.3 },
  { id: 'escaleras', name: 'Subir escaleras', emoji: '🪜', met: 8 }
];

export function activityKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}
