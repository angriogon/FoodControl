import { ACHIEVEMENTS } from './gamification';

export type Slot = 'color' | 'hat' | 'face' | 'neck' | 'scene';

export interface PetItem {
  id: string; // 'slot:nombre'
  slot: Slot;
  name: string;
  emoji: string;
  /** Precio en gemas si se puede comprar; undefined = solo por logro o gratis */
  price?: number;
  free?: boolean;
}

export const PET_COLORS: Record<string, { body: string; belly: string; name: string }> = {
  verde: { body: '#7BC67E', belly: '#F4D35E', name: 'Verde brote' },
  cielo: { body: '#7EC4E8', belly: '#FFF1B8', name: 'Cielo' },
  menta: { body: '#6FD3B6', belly: '#FFE7A8', name: 'Menta' },
  melocoton: { body: '#F7A98B', belly: '#FFE3C2', name: 'Melocotón' },
  lavanda: { body: '#B49BE8', belly: '#FCE38A', name: 'Lavanda' },
  dorado: { body: '#F2C14E', belly: '#FFF6D5', name: 'Dorado' },
  rosa: { body: '#F49AC1', belly: '#FFF0F6', name: 'Rosa chicle' }
};

export const SCENES: Record<string, { sky: [string, string]; ground: string; name: string }> = {
  prado: { sky: ['#DDEFFB', '#F1F8FD'], ground: '#B9DB6A', name: 'Prado' },
  playa: { sky: ['#BFE6F7', '#E9F7FD'], ground: '#F4DFA6', name: 'Playa' },
  montana: { sky: ['#D9E4F5', '#F3F6FB'], ground: '#9CC48B', name: 'Montaña' },
  cocina: { sky: ['#FBE7D3', '#FFF6EC'], ground: '#D9B48F', name: 'Cocina' },
  noche: { sky: ['#1F2A4A', '#3A4A78'], ground: '#4C6B3C', name: 'Noche estrellada' }
};

export const PET_ITEMS: PetItem[] = [
  // Colores
  ...Object.entries(PET_COLORS).map(([k, v]) => ({
    id: `color:${k}`, slot: 'color' as const, name: v.name, emoji: '🎨',
    free: k === 'verde', price: k === 'rosa' ? 250 : undefined
  })),
  // Gorros
  { id: 'hat:none', slot: 'hat', name: 'Sin gorro', emoji: '✖️', free: true },
  { id: 'hat:flor', slot: 'hat', name: 'Flor', emoji: '🌼' },
  { id: 'hat:gorra', slot: 'hat', name: 'Gorra deportiva', emoji: '🧢' },
  { id: 'hat:chef', slot: 'hat', name: 'Gorro de chef', emoji: '👨‍🍳' },
  { id: 'hat:corona', slot: 'hat', name: 'Corona', emoji: '👑' },
  { id: 'hat:lana', slot: 'hat', name: 'Gorro de lana', emoji: '🧶', price: 200 },
  { id: 'hat:auriculares', slot: 'hat', name: 'Auriculares', emoji: '🎧', price: 300 },
  // Cara
  { id: 'face:none', slot: 'face', name: 'Nada', emoji: '✖️', free: true },
  { id: 'face:gafas', slot: 'face', name: 'Gafas redondas', emoji: '👓' },
  { id: 'face:gafas-sol', slot: 'face', name: 'Gafas de sol', emoji: '🕶️' },
  { id: 'face:estrellas', slot: 'face', name: 'Ojos de estrella', emoji: '🤩', price: 150 },
  // Cuello
  { id: 'neck:none', slot: 'neck', name: 'Nada', emoji: '✖️', free: true },
  { id: 'neck:pajarita', slot: 'neck', name: 'Pajarita', emoji: '🎀' },
  { id: 'neck:bufanda', slot: 'neck', name: 'Bufanda', emoji: '🧣' },
  { id: 'neck:medalla', slot: 'neck', name: 'Medalla', emoji: '🥇' },
  { id: 'neck:collar-flores', slot: 'neck', name: 'Collar de flores', emoji: '🌺' },
  // Escenarios
  ...Object.entries(SCENES).map(([k, v]) => ({
    id: `scene:${k}`, slot: 'scene' as const, name: v.name, emoji: '🏞️', free: k === 'prado'
  }))
];

export const SLOT_LABELS: Record<Slot, string> = {
  color: 'Color',
  hat: 'Cabeza',
  face: 'Cara',
  neck: 'Cuello',
  scene: 'Escenario'
};

export function achievementForItem(itemId: string) {
  return ACHIEVEMENTS.find((a) => a.reward === itemId);
}

export function isItemOwned(itemId: string, unlocked: Record<string, string>, purchased: string[]): boolean {
  const item = PET_ITEMS.find((i) => i.id === itemId);
  if (!item) return false;
  if (item.free) return true;
  if (purchased.includes(itemId)) return true;
  const ach = achievementForItem(itemId);
  return !!ach && !!unlocked[ach.id];
}

export type Mood = 'feliz' | 'contento' | 'dormido' | 'eufórico';
