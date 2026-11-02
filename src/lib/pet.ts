import type { Equipped, Species } from '../types';
import { ACHIEVEMENTS, LEGACY_REWARDS } from './gamification';

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
  brote: { name: 'Brote', defaultName: 'Brotín', body: '#7BC67E', belly: '#F4D35E', description: 'Una semillita: le crecen hojas al subir de nivel' },
  gato: { name: 'Gatito', defaultName: 'Miso', body: '#F5A962', belly: '#FFF1DC', description: 'Curioso y glotón' },
  panda: { name: 'Panda', defaultName: 'Bambú', body: '#F7F7F5', belly: null, description: 'Tranquilo y comilón de verduras' },
  pollito: { name: 'Pollito', defaultName: 'Pío', body: '#FFD54F', belly: '#FFF3C4', description: 'Madrugador y lleno de energía' },
  conejo: { name: 'Conejito', defaultName: 'Coco', body: '#EFE3EA', belly: '#FFFFFF', description: 'Fan de las zanahorias' },
  dino: { name: 'Dino', defaultName: 'Rex', body: '#6CC6A5', belly: '#D9F2C6', description: 'Pequeño pero muy fuerte' }
};

export const SPECIES_ORDER: Species[] = ['brote', 'gato', 'panda', 'pollito', 'conejo', 'dino'];

/** Niveles en los que al Brote le sale una hoja nueva */
export const LEAF_LEVELS = [1, 3, 6, 10, 15];

// ───────────────────────── Colores ─────────────────────────

/** body null = color propio de la especie; gradient = degradado especial */
export const PET_COLORS: Record<string, { body: string | null; name: string; gradient?: string[] }> = {
  natural: { body: null, name: 'Natural' },
  menta: { body: '#6FD3B6', name: 'Menta' },
  cielo: { body: '#7EC4E8', name: 'Cielo' },
  melocoton: { body: '#F7A98B', name: 'Melocotón' },
  lima: { body: '#A8D86A', name: 'Lima' },
  gris: { body: '#B8BEC6', name: 'Gris perla' },
  blanco: { body: '#F6F6F2', name: 'Blanco nieve' },
  turquesa: { body: '#4FC3C7', name: 'Turquesa' },
  azul: { body: '#6D9EEB', name: 'Azul' },
  rojo: { body: '#F07167', name: 'Rojo' },
  rosa: { body: '#F49AC1', name: 'Rosa chicle' },
  coral: { body: '#FF8A7A', name: 'Coral' },
  morado: { body: '#9B72CF', name: 'Morado' },
  chocolate: { body: '#A47551', name: 'Chocolate' },
  lavanda: { body: '#B49BE8', name: 'Lavanda' },
  dorado: { body: '#F2C14E', name: 'Dorado' },
  noche: { body: '#5B6B9A', name: 'Medianoche' },
  arcoiris: { body: '#F49AC1', name: 'Arcoíris', gradient: ['#FF8A7A', '#FFD54F', '#A8D86A', '#6D9EEB', '#B49BE8'] },
  galaxia: { body: '#4B3B8F', name: 'Galaxia', gradient: ['#2B2F77', '#6C3FB5', '#C04BA8'] },
  oro: { body: '#F2C14E', name: 'Oro brillante', gradient: ['#FFF0A8', '#F2C14E', '#C9921A'] }
};

export function bodyColor(species: Species, color: string): string {
  return PET_COLORS[color]?.body ?? SPECIES[species].body;
}

// ───────────────────────── Escenarios ─────────────────────────

export const SCENES: Record<string, { sky: [string, string]; ground: string; name: string; dark?: boolean }> = {
  prado: { sky: ['#DDEFFB', '#F3F9FD'], ground: '#B9DB6A', name: 'Prado' },
  playa: { sky: ['#BFE6F7', '#E9F7FD'], ground: '#F4DFA6', name: 'Playa' },
  montana: { sky: ['#D9E4F5', '#F3F6FB'], ground: '#9CC48B', name: 'Montaña' },
  cocina: { sky: ['#FBE7D3', '#FFF6EC'], ground: '#D9B48F', name: 'Cocina' },
  ciudad: { sky: ['#FFE3C7', '#FFF4E6'], ground: '#C9D3DD', name: 'Ciudad' },
  gimnasio: { sky: ['#E3E8EF', '#F4F6F9'], ground: '#9AA8B8', name: 'Gimnasio' },
  nieve: { sky: ['#DCE8F5', '#F5F9FD'], ground: '#F7FAFD', name: 'Nieve' },
  otono: { sky: ['#FCE6CF', '#FFF5EA'], ground: '#D9A066', name: 'Otoño' },
  desierto: { sky: ['#FFE9C2', '#FFF7E6'], ground: '#E9C27D', name: 'Desierto' },
  bosque: { sky: ['#D6EEDC', '#F1FAF3'], ground: '#7FB069', name: 'Bosque' },
  cerezo: { sky: ['#FDE4EE', '#FFF5F9'], ground: '#B6D98A', name: 'Cerezo en flor' },
  huerto: { sky: ['#E2F2DA', '#F6FBF2'], ground: '#9C7350', name: 'Huerto' },
  mercado: { sky: ['#FFF0D6', '#FFF9EE'], ground: '#D8C3A5', name: 'Mercado' },
  estadio: { sky: ['#CFE6FA', '#EEF6FD'], ground: '#5FB35F', name: 'Estadio' },
  submarino: { sky: ['#4FA8D9', '#9ED8F0'], ground: '#E7D3A1', name: 'Fondo del mar' },
  noche: { sky: ['#1F2A4A', '#3A4A78'], ground: '#4C6B3C', name: 'Noche estrellada', dark: true },
  espacio: { sky: ['#0E1230', '#2A2466'], ground: '#9EA3B5', name: 'Espacio', dark: true }
};

// ───────────────────────── Catálogo ─────────────────────────

export type Rarity = 'comun' | 'raro' | 'epico' | 'legendario' | 'logro';

export const RARITY: Record<Rarity, { name: string; color: string }> = {
  comun: { name: 'Común', color: '#8a8a8f' },
  raro: { name: 'Raro', color: '#0a7ad6' },
  epico: { name: 'Épico', color: '#8e44c9' },
  legendario: { name: 'Legendario', color: '#c27a00' },
  logro: { name: 'Exclusivo', color: '#248a3d' }
};

export interface PetItem {
  id: string; // 'slot:valor'
  slot: Slot;
  name: string;
  /** Precio en gemas; sin precio y sin ser gratis = exclusivo de logro */
  price?: number;
  free?: boolean;
}

export function rarityOf(item: PetItem): Rarity | null {
  if (item.free) return null;
  if (!item.price) return 'logro';
  if (item.price <= 250) return 'comun';
  if (item.price <= 700) return 'raro';
  if (item.price <= 1500) return 'epico';
  return 'legendario';
}

type Row = [value: string, name: string, price?: number | 'free'];
const slot = (s: Slot, rows: Row[]): PetItem[] =>
  rows.map(([value, name, price]) => ({
    id: `${s}:${value}`, slot: s, name,
    ...(price === 'free' ? { free: true } : price ? { price } : {})
  }));

// Sin precio = se consigue con un logro (ver gamification.ts)
export const PET_ITEMS: PetItem[] = [
  ...slot('hat', [
    ['none', 'Nada', 'free'], ['gorra', 'Gorra', 'free'], ['lazo', 'Lazo', 150], ['cerezas', 'Cerezas', 200],
    ['paja', 'Sombrero de paja', 300], ['lana', 'Gorro de lana', 300], ['boina', 'Boina', 300], ['casco', 'Casco de bici', 400],
    ['navidad', 'Gorro navideño', 500], ['fiesta', 'Gorro de fiesta', 500], ['vaquero', 'Sombrero vaquero', 600],
    ['auriculares', 'Auriculares', 800], ['pirata', 'Sombrero pirata', 900], ['mago', 'Sombrero de mago', 1200],
    ['flor', 'Flor'], ['cinta', 'Cinta deportiva'], ['chef', 'Gorro de chef'], ['laurel', 'Corona de laurel'],
    ['copa', 'Chistera'], ['vikingo', 'Casco vikingo'], ['birrete', 'Birrete'], ['girasol', 'Girasol'],
    ['tiara', 'Tiara'], ['halo', 'Aureola'], ['corona', 'Corona']
  ]),
  ...slot('face', [
    ['none', 'Nada', 'free'], ['pecas', 'Pecas', 'free'], ['tirita', 'Tirita', 150], ['bigote', 'Bigote', 250],
    ['estrellas', 'Ojos de estrella', 400], ['corazones', 'Ojos de corazón', 400], ['gafas-corazon', 'Gafas de corazón', 600],
    ['antifaz', 'Antifaz', 700], ['gafas-pixel', 'Gafas pixeladas', 1000],
    ['gafas', 'Gafas redondas'], ['gafas-sol', 'Gafas de sol'], ['gafas-natacion', 'Gafas de natación'], ['monoculo', 'Monóculo']
  ]),
  ...slot('neck', [
    ['none', 'Nada', 'free'], ['panuelo', 'Pañuelo', 'free'], ['bufanda', 'Bufanda', 250], ['perlas', 'Collar de perlas', 300],
    ['corbata', 'Corbata', 300], ['toalla', 'Toalla', 500], ['capa', 'Capa de héroe', 1500],
    ['pajarita', 'Pajarita'], ['cascabel', 'Cascabel'], ['collar-flores', 'Collar de flores'], ['silbato', 'Silbato'],
    ['lazo-grande', 'Lazo grande'], ['medalla', 'Medalla']
  ]),
  ...slot('body', [
    ['none', 'Nada', 'free'], ['camiseta', 'Camiseta', 'free'], ['rayas', 'Marinera', 250], ['peto', 'Peto vaquero', 400],
    ['sudadera', 'Sudadera', 400], ['hawaiana', 'Camisa hawaiana', 500], ['impermeable', 'Chubasquero', 500],
    ['jersey', 'Jersey navideño', 600], ['tutu', 'Tutú', 600], ['flotador', 'Flotador', 700],
    ['deportiva', 'Equipación'], ['chaleco', 'Chaleco'], ['delantal', 'Delantal de chef'], ['traje', 'Traje'],
    ['kimono', 'Kimono'], ['superheroe', 'Traje de superhéroe'], ['cinturon', 'Cinturón de campeón']
  ]),
  ...slot('hand', [
    ['none', 'Nada', 'free'], ['manzana', 'Manzana', 'free'], ['platano', 'Plátano', 120], ['taza', 'Taza', 150],
    ['globo', 'Globo', 200], ['helado', 'Helado', 250], ['batido', 'Batido', 250], ['banderin', 'Banderín', 300],
    ['ramo', 'Ramo de flores', 350], ['paraguas', 'Paraguas', 400], ['pelota', 'Balón', 400], ['raqueta', 'Raqueta', 500],
    ['varita', 'Varita mágica', 1500],
    ['botella', 'Botella de agua'], ['zanahoria', 'Zanahoria'], ['pesa', 'Pesa'], ['brocoli', 'Brócoli'],
    ['cronometro', 'Cronómetro'], ['libro', 'Libro'], ['trofeo', 'Trofeo']
  ]),
  ...slot('pal', [
    ['none', 'Ninguno', 'free'], ['caracol', 'Caracol', 600], ['mariposa', 'Mariposa', 800], ['abeja', 'Abejita', 900],
    ['pez', 'Pececito', 1200], ['pajarito', 'Pajarito'], ['perrito', 'Perrito'], ['estrella', 'Estrellita']
  ]),
  ...slot('color', [
    ['natural', 'Natural', 'free'], ['cielo', 'Cielo', 150], ['melocoton', 'Melocotón', 150], ['lima', 'Lima', 150],
    ['gris', 'Gris perla', 150], ['blanco', 'Blanco nieve', 200], ['turquesa', 'Turquesa', 300], ['azul', 'Azul', 300],
    ['rojo', 'Rojo', 300], ['rosa', 'Rosa chicle', 300], ['coral', 'Coral', 400], ['morado', 'Morado', 400],
    ['chocolate', 'Chocolate', 400], ['noche', 'Medianoche', 800], ['arcoiris', 'Arcoíris', 2500],
    ['menta', 'Menta'], ['lavanda', 'Lavanda'], ['dorado', 'Dorado'], ['oro', 'Oro brillante'], ['galaxia', 'Galaxia']
  ]),
  ...slot('scene', [
    ['prado', 'Prado', 'free'], ['ciudad', 'Ciudad', 400], ['nieve', 'Nieve', 500], ['otono', 'Otoño', 500],
    ['desierto', 'Desierto', 600], ['gimnasio', 'Gimnasio', 600], ['cocina', 'Cocina', 700],
    ['montana', 'Montaña'], ['playa', 'Playa'], ['cerezo', 'Cerezo en flor'], ['mercado', 'Mercado'], ['huerto', 'Huerto'],
    ['submarino', 'Fondo del mar'], ['estadio', 'Estadio'], ['bosque', 'Bosque'], ['noche', 'Noche estrellada'], ['espacio', 'Espacio']
  ])
];

export const SLOT_LABELS: Record<Slot, string> = {
  hat: 'Cabeza',
  face: 'Cara',
  neck: 'Cuello',
  body: 'Ropa',
  hand: 'Mano',
  pal: 'Compañero',
  color: 'Color',
  scene: 'Fondo'
};

export const SLOT_ORDER: Slot[] = ['hat', 'face', 'neck', 'body', 'hand', 'pal', 'color', 'scene'];

export function achievementForItem(itemId: string) {
  return ACHIEVEMENTS.find((a) => a.reward === itemId);
}

export function isItemOwned(itemId: string, unlocked: Record<string, string>, purchased: string[]): boolean {
  const it = PET_ITEMS.find((i) => i.id === itemId);
  if (!it) return false;
  if (it.free || purchased.includes(itemId)) return true;
  const ach = achievementForItem(itemId);
  if (ach && unlocked[ach.id]) return true;
  // Artículos ganados con los logros de la versión anterior
  return Object.entries(LEGACY_REWARDS).some(([id, reward]) => reward === itemId && unlocked[id]);
}

export function itemName(itemId: string): string {
  return PET_ITEMS.find((i) => i.id === itemId)?.name ?? itemId;
}
