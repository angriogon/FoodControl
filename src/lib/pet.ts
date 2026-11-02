import type { Equipped, Species } from '../types';
import { ACHIEVEMENTS } from './gamification';

export type Slot = keyof Equipped;
export type Mood = 'feliz' | 'contento' | 'dormido' | 'eufórico';

// ───────────────────────── Especies ─────────────────────────

export interface SpeciesInfo {
  name: string;
  defaultName: string;
  body: string;
  belly: string | null;
  description: string;
}

export const SPECIES: Record<Species, SpeciesInfo> = {
  brote: { name: 'Brote', defaultName: 'Brotín', body: '#7BC67E', belly: '#F4D35E', description: 'Una semillita: le crece una hoja por nivel' },
  gato: { name: 'Gatito', defaultName: 'Miso', body: '#F5A962', belly: '#FFF1DC', description: 'Curioso y glotón' },
  panda: { name: 'Panda', defaultName: 'Bambú', body: '#F7F7F5', belly: null, description: 'Tranquilo y comilón de verduras' },
  pollito: { name: 'Pollito', defaultName: 'Pío', body: '#FFD54F', belly: '#FFF3C4', description: 'Madrugador y lleno de energía' },
  conejo: { name: 'Conejito', defaultName: 'Coco', body: '#EFE3EA', belly: '#FFFFFF', description: 'Fan de las zanahorias' },
  dino: { name: 'Dino', defaultName: 'Rex', body: '#6CC6A5', belly: '#D9F2C6', description: 'Pequeño pero muy fuerte' }
};

export const SPECIES_ORDER: Species[] = ['brote', 'gato', 'panda', 'pollito', 'conejo', 'dino'];

// ───────────────────────── Colores y escenarios ─────────────────────────

/** 'natural' usa el color propio de cada especie */
export const PET_COLORS: Record<string, { body: string | null; name: string }> = {
  natural: { body: null, name: 'Natural' },
  menta: { body: '#6FD3B6', name: 'Menta' },
  cielo: { body: '#7EC4E8', name: 'Cielo' },
  melocoton: { body: '#F7A98B', name: 'Melocotón' },
  lavanda: { body: '#B49BE8', name: 'Lavanda' },
  rosa: { body: '#F49AC1', name: 'Rosa chicle' },
  coral: { body: '#FF8A7A', name: 'Coral' },
  dorado: { body: '#F2C14E', name: 'Dorado' },
  noche: { body: '#5B6B9A', name: 'Medianoche' }
};

export function bodyColor(species: Species, color: string): string {
  return PET_COLORS[color]?.body ?? SPECIES[species].body;
}

export const SCENES: Record<string, { sky: [string, string]; ground: string; name: string; dark?: boolean }> = {
  prado: { sky: ['#DDEFFB', '#F3F9FD'], ground: '#B9DB6A', name: 'Prado' },
  playa: { sky: ['#BFE6F7', '#E9F7FD'], ground: '#F4DFA6', name: 'Playa' },
  montana: { sky: ['#D9E4F5', '#F3F6FB'], ground: '#9CC48B', name: 'Montaña' },
  cocina: { sky: ['#FBE7D3', '#FFF6EC'], ground: '#D9B48F', name: 'Cocina' },
  ciudad: { sky: ['#FFE3C7', '#FFF4E6'], ground: '#C9D3DD', name: 'Ciudad' },
  gimnasio: { sky: ['#E3E8EF', '#F4F6F9'], ground: '#9AA8B8', name: 'Gimnasio' },
  nieve: { sky: ['#DCE8F5', '#F5F9FD'], ground: '#F7FAFD', name: 'Nieve' },
  noche: { sky: ['#1F2A4A', '#3A4A78'], ground: '#4C6B3C', name: 'Noche estrellada', dark: true }
};

// ───────────────────────── Catálogo de artículos ─────────────────────────

export interface PetItem {
  id: string; // 'slot:valor'
  slot: Slot;
  name: string;
  /** Precio en gemas; sin precio y sin ser gratis = solo por logro */
  price?: number;
  free?: boolean;
}

const item = (slot: Slot, value: string, name: string, opts: { price?: number; free?: boolean } = {}): PetItem => ({
  id: `${slot}:${value}`, slot, name, ...opts
});

export const PET_ITEMS: PetItem[] = [
  // Color
  item('color', 'natural', 'Natural', { free: true }),
  item('color', 'menta', 'Menta'),
  item('color', 'cielo', 'Cielo', { price: 100 }),
  item('color', 'melocoton', 'Melocotón', { price: 100 }),
  item('color', 'lavanda', 'Lavanda'),
  item('color', 'rosa', 'Rosa chicle', { price: 150 }),
  item('color', 'coral', 'Coral', { price: 150 }),
  item('color', 'dorado', 'Dorado'),
  item('color', 'noche', 'Medianoche', { price: 200 }),
  // Cabeza
  item('hat', 'none', 'Nada', { free: true }),
  item('hat', 'gorra', 'Gorra', { free: true }),
  item('hat', 'flor', 'Flor'),
  item('hat', 'cinta', 'Cinta deportiva'),
  item('hat', 'lazo', 'Lazo', { price: 100 }),
  item('hat', 'paja', 'Sombrero de paja', { price: 150 }),
  item('hat', 'lana', 'Gorro de lana', { price: 150 }),
  item('hat', 'boina', 'Boina', { price: 150 }),
  item('hat', 'fiesta', 'Gorro de fiesta', { price: 200 }),
  item('hat', 'auriculares', 'Auriculares', { price: 250 }),
  item('hat', 'chef', 'Gorro de chef'),
  item('hat', 'corona', 'Corona'),
  // Cara
  item('face', 'none', 'Nada', { free: true }),
  item('face', 'gafas', 'Gafas redondas'),
  item('face', 'gafas-sol', 'Gafas de sol'),
  item('face', 'estrellas', 'Ojos de estrella', { price: 150 }),
  item('face', 'corazones', 'Ojos de corazón', { price: 150 }),
  // Cuello
  item('neck', 'none', 'Nada', { free: true }),
  item('neck', 'panuelo', 'Pañuelo', { free: true }),
  item('neck', 'pajarita', 'Pajarita'),
  item('neck', 'bufanda', 'Bufanda', { price: 120 }),
  item('neck', 'corbata', 'Corbata', { price: 150 }),
  item('neck', 'collar-flores', 'Collar de flores'),
  item('neck', 'medalla', 'Medalla'),
  // Ropa
  item('body', 'none', 'Nada', { free: true }),
  item('body', 'camiseta', 'Camiseta', { free: true }),
  item('body', 'sudadera', 'Sudadera', { price: 200 }),
  item('body', 'tutu', 'Tutú', { price: 250 }),
  item('body', 'deportiva', 'Equipación'),
  item('body', 'delantal', 'Delantal de chef'),
  // Mano
  item('hand', 'none', 'Nada', { free: true }),
  item('hand', 'manzana', 'Manzana', { free: true }),
  item('hand', 'taza', 'Taza', { price: 80 }),
  item('hand', 'globo', 'Globo', { price: 100 }),
  item('hand', 'raqueta', 'Raqueta', { price: 200 }),
  item('hand', 'botella', 'Botella de agua'),
  item('hand', 'pesa', 'Pesa'),
  // Fondo
  item('scene', 'prado', 'Prado', { free: true }),
  item('scene', 'playa', 'Playa'),
  item('scene', 'montana', 'Montaña'),
  item('scene', 'cocina', 'Cocina', { price: 250 }),
  item('scene', 'ciudad', 'Ciudad', { price: 250 }),
  item('scene', 'gimnasio', 'Gimnasio', { price: 300 }),
  item('scene', 'nieve', 'Nieve', { price: 300 }),
  item('scene', 'noche', 'Noche estrellada')
];

export const SLOT_LABELS: Record<Slot, string> = {
  color: 'Color',
  hat: 'Cabeza',
  face: 'Cara',
  neck: 'Cuello',
  body: 'Ropa',
  hand: 'Mano',
  scene: 'Fondo'
};

export const SLOT_ORDER: Slot[] = ['hat', 'face', 'neck', 'body', 'hand', 'color', 'scene'];

export function achievementForItem(itemId: string) {
  return ACHIEVEMENTS.find((a) => a.reward === itemId);
}

export function isItemOwned(itemId: string, unlocked: Record<string, string>, purchased: string[]): boolean {
  const it = PET_ITEMS.find((i) => i.id === itemId);
  if (!it) return false;
  if (it.free || purchased.includes(itemId)) return true;
  const ach = achievementForItem(itemId);
  return !!ach && !!unlocked[ach.id];
}

export function itemName(itemId: string): string {
  return PET_ITEMS.find((i) => i.id === itemId)?.name ?? itemId;
}
