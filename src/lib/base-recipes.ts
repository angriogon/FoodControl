import type { Portion, Recipe } from '../types';
import { BASE_FOODS } from './foods';

// Recetario “de la casa”: platos habituales hechos con alimentos de la base
// local. Se pueden añadir tal cual o guardar una copia para adaptarla.
// [ingredienteId, gramos]
type Def = [id: string, name: string, emoji: string, servings: number, ingredients: [string, number][], tags: string[], cooked?: number];

const DEFS: Def[] = [
  ['tortilla-patata', 'Tortilla de patata', '🍳', 6, [['huevo', 330], ['patata-cocida', 600], ['cebolla', 150], ['aceite-oliva', 60]], ['comida', 'cena', 'clásico'], 1000],
  ['lentejas-estofadas', 'Lentejas estofadas', '🍲', 4, [['lentejas', 800], ['chorizo', 60], ['zanahoria', 100], ['cebolla', 100], ['pimiento', 80], ['patata-cocida', 200], ['tomate-triturado', 100], ['aceite-oliva', 20]], ['comida', 'legumbre']],
  ['garbanzos-espinacas-casa', 'Garbanzos con espinacas', '🍲', 4, [['garbanzos', 800], ['espinacas', 300], ['tomate-triturado', 100], ['ajo', 10], ['pan-blanco', 30], ['aceite-oliva', 30]], ['comida', 'legumbre', 'vegetariano']],
  ['ensalada-casera', 'Ensalada mixta completa', '🥗', 2, [['lechuga', 150], ['tomate', 200], ['cebolla', 50], ['atun-natural', 112], ['huevo-cocido', 100], ['aceitunas', 40], ['maiz-dulce', 70], ['aceite-oliva', 20]], ['comida', 'cena', 'ligero']],
  ['pollo-horno-patatas', 'Pollo al horno con patatas', '🍗', 4, [['muslo-pollo', 800], ['patata-cocida', 600], ['cebolla', 150], ['pimiento', 150], ['aceite-oliva', 30]], ['comida', 'horno']],
  ['salmon-verduras', 'Salmón al horno con verduras', '🐟', 2, [['salmon', 300], ['calabacin', 200], ['pimiento', 150], ['cebolla', 100], ['aceite-oliva', 15]], ['cena', 'horno', 'alto en proteína']],
  ['merluza-salsa-verde', 'Merluza en salsa verde', '🐟', 4, [['merluza', 600], ['almejas', 200], ['guisantes', 100], ['ajo', 10], ['harina-trigo', 15], ['aceite-oliva', 30]], ['comida', 'cena', 'pescado']],
  ['arroz-pollo', 'Arroz con pollo y verduras', '🍚', 4, [['arroz-cocido', 800], ['pechuga-pollo', 400], ['pimiento', 150], ['tomate-triturado', 150], ['guisantes', 100], ['aceite-oliva', 30]], ['comida']],
  ['pasta-atun', 'Pasta con tomate y atún', '🍝', 2, [['pasta-cocida', 400], ['salsa-tomate-pasta', 200], ['atun-natural', 112], ['queso-rallado', 20]], ['comida', 'rápido']],
  ['crema-calabacin', 'Crema de calabacín', '🥣', 4, [['calabacin', 800], ['patata-cocida', 200], ['cebolla', 100], ['queso-crema', 40], ['caldo', 500], ['aceite-oliva', 20]], ['cena', 'ligero', 'vegetariano'], 1500],
  ['gazpacho-casero', 'Gazpacho casero', '🍅', 5, [['tomate', 1000], ['pepino', 150], ['pimiento', 100], ['pan-blanco', 50], ['ajo', 5], ['vinagre', 20], ['aceite-oliva', 50]], ['verano', 'vegetariano', 'ligero']],
  ['fajitas-pollo', 'Fajitas de pollo', '🌯', 2, [['tortilla-trigo', 120], ['pechuga-pollo', 250], ['pimiento', 150], ['cebolla', 100], ['guacamole', 40], ['aceite-oliva', 10]], ['cena']],
  ['wok-ternera', 'Wok de ternera con arroz', '🥢', 2, [['ternera', 250], ['verduras-wok', 300], ['arroz-cocido', 300], ['salsa-soja', 20], ['aceite-oliva', 15]], ['comida', 'cena', 'alto en proteína']],
  ['pisto-huevo', 'Pisto con huevo', '🍳', 2, [['pisto', 400], ['huevo', 110]], ['cena', 'vegetariano']],
  ['ensalada-garbanzos', 'Ensalada de garbanzos', '🥗', 2, [['garbanzos', 300], ['tomate', 150], ['pepino', 100], ['cebolla', 40], ['atun-natural', 56], ['aceite-oliva', 15]], ['comida', 'cena', 'legumbre']],
  ['pechuga-ensalada', 'Pechuga a la plancha con ensalada', '🥗', 1, [['pechuga-pollo', 150], ['lechuga', 80], ['tomate', 120], ['aceite-oliva', 10]], ['comida', 'cena', 'alto en proteína', 'ligero']],
  ['porridge-platano', 'Porridge de avena y plátano', '🥣', 1, [['avena', 50], ['leche-semi', 250], ['platano', 60]], ['desayuno']],
  ['tostada-aguacate-huevo', 'Tostada integral con aguacate y huevo', '🥑', 1, [['pan-integral', 60], ['aguacate', 70], ['huevo', 55]], ['desayuno']],
  ['bol-yogur', 'Bol de queso batido con frutos rojos', '🥣', 1, [['queso-fresco-batido', 250], ['frutos-rojos', 100], ['avena', 30], ['nueces', 15]], ['desayuno', 'snack', 'alto en proteína']],
  ['revuelto-champinones', 'Huevos revueltos con champiñones', '🍳', 1, [['huevo', 110], ['champinones', 100], ['aceite-oliva', 5]], ['desayuno', 'cena']],
  ['batido-platano', 'Batido de proteína con plátano', '🥤', 1, [['leche-semi', 250], ['platano', 120], ['batido-proteina', 30]], ['desayuno', 'snack', 'alto en proteína']],
  ['bocadillo-pavo', 'Bocadillo de pavo y queso fresco', '🥪', 1, [['pan-integral', 100], ['pavo-fiambre', 45], ['queso-fresco', 50], ['tomate', 50]], ['desayuno', 'snack']]
];

const byId = new Map(BASE_FOODS.map((f) => [f.id, f]));

export const BASE_RECIPES: Recipe[] = DEFS.map(([id, name, emoji, servings, ingredients, tags, cooked]) => ({
  id: `base-${id}`,
  name,
  emoji,
  servings,
  ingredients: ingredients
    .map(([fid, amount]): Portion | null => {
      const food = byId.get(`base:${fid}`);
      if (!food) {
        console.warn('Ingrediente no encontrado en la base:', fid);
        return null;
      }
      return { food, amount };
    })
    .filter((p): p is Portion => p !== null),
  cookedWeightG: cooked,
  tags,
  createdAt: '2026-11-02T00:00:00.000Z'
}));

export const isBaseRecipe = (id: string) => id.startsWith('base-');
