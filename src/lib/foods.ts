import type { Food, QualityGrade } from '../types';
import { EXTRA_ROWS } from './foods-extra';

// Valores aproximados por 100 g (o 100 ml), basados en tablas de composición
// habituales (BEDCA / USDA). Suficientemente precisos para un diario personal.
// Formato compacto: [id, nombre, emoji, kcal, prot, carbs, grasa, fibra, azúcar, grasaSat, ración, gramosRación, grado, unidad]
export type FoodRow = [string, string, string, number, number, number, number, number, number, number, string?, number?, QualityGrade?, ('g' | 'ml')?];
type Row = FoodRow;

const ROWS: Row[] = [
  // Huevos, carnes y pescados
  ['huevo', 'Huevo', '🥚', 143, 12.6, 0.7, 9.5, 0, 0.4, 3.1, '1 huevo (M)', 55, 'A'],
  ['huevos-revueltos', 'Huevos revueltos', '🍳', 166, 11, 2, 12.5, 0, 1.5, 3.9, '2 huevos', 120, 'B'],
  ['clara-huevo', 'Claras de huevo', '🥚', 52, 10.9, 0.7, 0.2, 0, 0.7, 0, '1 clara', 33, 'A'],
  ['pechuga-pollo', 'Pechuga de pollo (plancha)', '🍗', 165, 31, 0, 3.6, 0, 0, 1, '1 filete', 150, 'A'],
  ['muslo-pollo', 'Muslo de pollo (asado)', '🍗', 209, 26, 0, 10.9, 0, 0, 3, '1 muslo', 120, 'B'],
  ['pavo-fiambre', 'Pechuga de pavo (fiambre 92%)', '🦃', 105, 19, 2.5, 1.8, 0, 1.5, 0.6, '3 lonchas', 45, 'B'],
  ['ternera', 'Ternera magra (plancha)', '🥩', 180, 28, 0, 7.5, 0, 0, 3, '1 filete', 150, 'B'],
  ['cerdo-lomo', 'Lomo de cerdo (plancha)', '🥩', 190, 29, 0, 8, 0, 0, 2.8, '1 filete', 130, 'B'],
  ['carne-picada', 'Carne picada mixta', '🍖', 250, 18, 0, 20, 0, 0, 8, '1 ración', 125, 'D'],
  ['jamon-serrano', 'Jamón serrano', '🍖', 240, 31, 0.5, 13, 0, 0.5, 4.5, '3 lonchas', 30, 'D'],
  ['jamon-cocido', 'Jamón cocido', '🍖', 115, 18, 1.5, 4, 0, 1, 1.4, '3 lonchas', 45, 'C'],
  ['chorizo', 'Chorizo', '🌭', 455, 24, 2, 38, 0, 1, 14, '5 rodajas', 30, 'E'],
  ['salmon', 'Salmón', '🐟', 208, 20, 0, 13, 0, 0, 3.1, '1 lomo', 150, 'A'],
  ['merluza', 'Merluza', '🐟', 86, 17, 0, 1.8, 0, 0, 0.4, '1 filete', 150, 'A'],
  ['atun-natural', 'Atún al natural (lata)', '🐟', 110, 25, 0, 1, 0, 0, 0.3, '1 lata escurrida', 56, 'A'],
  ['atun-aceite', 'Atún en aceite (escurrido)', '🐟', 190, 26, 0, 9.5, 0, 0, 1.5, '1 lata escurrida', 56, 'B'],
  ['sardinas', 'Sardinas en lata', '🐟', 208, 24.6, 0, 11.5, 0, 0, 3, '1 lata', 85, 'A'],
  ['gambas', 'Gambas / langostinos', '🦐', 99, 24, 0.2, 0.3, 0, 0, 0.1, '1 ración', 100, 'A'],
  // Lácteos
  ['leche-entera', 'Leche entera', '🥛', 64, 3.2, 4.7, 3.6, 0, 4.7, 2.3, '1 vaso', 250, 'B', 'ml'],
  ['leche-semi', 'Leche semidesnatada', '🥛', 46, 3.3, 4.8, 1.6, 0, 4.8, 1, '1 vaso', 250, 'A', 'ml'],
  ['leche-desnatada', 'Leche desnatada', '🥛', 35, 3.4, 5, 0.1, 0, 5, 0.1, '1 vaso', 250, 'A', 'ml'],
  ['bebida-avena', 'Bebida de avena', '🥛', 45, 0.8, 7, 1.5, 0.8, 4, 0.2, '1 vaso', 250, 'C', 'ml'],
  ['yogur-natural', 'Yogur natural', '🥣', 61, 3.5, 4.7, 3.3, 0, 4.7, 2.1, '1 yogur', 125, 'A'],
  ['yogur-griego', 'Yogur griego', '🥣', 130, 6, 4, 10, 0, 4, 6.5, '1 yogur', 125, 'C'],
  ['yogur-proteico', 'Yogur alto en proteínas', '🥣', 60, 10, 4, 0.2, 0, 4, 0.1, '1 yogur', 150, 'A'],
  ['queso-fresco-batido', 'Queso fresco batido 0%', '🥣', 46, 8, 3.5, 0.1, 0, 3.5, 0.1, '1 tarrina', 250, 'A'],
  ['queso-cottage', 'Queso cottage', '🧀', 98, 11, 3.4, 4.3, 0, 2.7, 1.7, '1 ración', 100, 'A'],
  ['queso-fresco', 'Queso fresco (Burgos)', '🧀', 175, 12, 3, 13, 0, 3, 8, '1 porción', 60, 'B'],
  ['queso-curado', 'Queso curado', '🧀', 410, 26, 0.5, 34, 0, 0.5, 21, '1 cuña', 30, 'D'],
  ['mozzarella', 'Mozzarella', '🧀', 250, 18, 2, 19, 0, 1, 12, '½ bola', 60, 'C'],
  // Cereales, pan y legumbres
  ['pan-blanco', 'Pan blanco (barra)', '🥖', 265, 8.5, 51, 1.6, 2.7, 3, 0.3, '1 trozo', 60, 'C'],
  ['pan-integral', 'Pan integral', '🍞', 247, 13, 41, 3.4, 7, 6, 0.7, '1 rebanada', 40, 'A'],
  ['pan-semillas', 'Pan de semillas', '🍞', 280, 11, 38, 9, 7, 3, 1.2, '1 rebanada', 40, 'A'],
  ['pan-molde', 'Pan de molde', '🍞', 260, 8, 47, 4, 3, 5, 0.8, '1 rebanada', 30, 'C'],
  ['tostada-aguacate', 'Tostada integral con aguacate', '🥑', 210, 5.5, 22, 11, 6.5, 1.5, 1.6, '1 tostada', 110, 'A'],
  ['avena', 'Copos de avena', '🌾', 372, 13.5, 59, 7, 10, 1, 1.2, '1 ración', 40, 'A'],
  ['muesli', 'Muesli sin azúcar', '🥣', 360, 10, 62, 6, 8, 12, 1, '1 bol', 45, 'B'],
  ['cereales-azucarados', 'Cereales de desayuno azucarados', '🥣', 390, 7, 82, 3, 3, 30, 0.8, '1 bol', 30, 'E'],
  ['arroz-cocido', 'Arroz blanco (cocido)', '🍚', 130, 2.7, 28, 0.3, 0.4, 0, 0.1, '1 plato', 200, 'B'],
  ['arroz-integral', 'Arroz integral (cocido)', '🍚', 123, 2.7, 25.6, 1, 1.6, 0.4, 0.2, '1 plato', 200, 'A'],
  ['pasta-cocida', 'Pasta (cocida)', '🍝', 157, 5.8, 30.9, 0.9, 1.8, 0.6, 0.2, '1 plato', 200, 'B'],
  ['pasta-integral', 'Pasta integral (cocida)', '🍝', 149, 6, 27, 1.7, 4, 1, 0.3, '1 plato', 200, 'A'],
  ['quinoa', 'Quinoa (cocida)', '🍚', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 0.2, '1 ración', 150, 'A'],
  ['lentejas', 'Lentejas (cocidas)', '🍲', 116, 9, 20, 0.4, 7.9, 1.8, 0.1, '1 plato', 250, 'A'],
  ['garbanzos', 'Garbanzos (cocidos)', '🍲', 139, 7.6, 21, 2.6, 7.6, 3.5, 0.3, '1 plato', 250, 'A'],
  ['alubias', 'Alubias (cocidas)', '🍲', 127, 8.7, 22.8, 0.5, 6.4, 0.3, 0.1, '1 plato', 250, 'A'],
  ['hummus', 'Hummus', '🥙', 177, 7.9, 14.3, 9.6, 6, 0.3, 1.4, '2 cucharadas', 30, 'A'],
  ['tofu', 'Tofu', '🧊', 144, 15.6, 2.8, 8.7, 2.3, 0.6, 1.3, '1 ración', 100, 'A'],
  // Verduras y hortalizas
  ['lechuga', 'Lechuga / ensalada verde', '🥬', 15, 1.4, 2.9, 0.2, 1.3, 0.8, 0, '1 bol', 80, 'A'],
  ['tomate', 'Tomate', '🍅', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 0, '1 tomate', 120, 'A'],
  ['pepino', 'Pepino', '🥒', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 0, '½ pepino', 100, 'A'],
  ['zanahoria', 'Zanahoria', '🥕', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 0, '1 zanahoria', 70, 'A'],
  ['brocoli', 'Brócoli', '🥦', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 0, '1 ración', 150, 'A'],
  ['esparragos', 'Espárragos verdes (plancha)', '🌱', 22, 2.4, 4.1, 0.2, 2.1, 1.3, 0, '1 manojo', 120, 'A'],
  ['calabacin', 'Calabacín', '🥒', 17, 1.2, 3.1, 0.3, 1, 2.5, 0.1, '½ calabacín', 150, 'A'],
  ['pimiento', 'Pimiento', '🫑', 31, 1, 6, 0.3, 2.1, 4.2, 0, '1 pimiento', 150, 'A'],
  ['espinacas', 'Espinacas', '🥬', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 0.1, '1 ración', 100, 'A'],
  ['champinones', 'Champiñones', '🍄', 22, 3.1, 3.3, 0.3, 1, 2, 0, '1 ración', 100, 'A'],
  ['alcachofa', 'Alcachofas', '🌿', 47, 3.3, 10.5, 0.2, 5.4, 1, 0, '1 ración', 150, 'A'],
  ['judias-verdes', 'Judías verdes', '🫛', 31, 1.8, 7, 0.2, 2.7, 3.3, 0, '1 plato', 200, 'A'],
  ['patata-cocida', 'Patata cocida', '🥔', 87, 1.9, 20, 0.1, 1.8, 0.9, 0, '1 patata', 150, 'A'],
  ['patata-airfryer', 'Patata al airfryer', '🥔', 120, 2.5, 22, 2.5, 2.2, 1, 0.4, '1 ración', 150, 'B'],
  ['patatas-fritas', 'Patatas fritas', '🍟', 312, 3.4, 41, 15, 3.8, 0.3, 2.3, '1 ración', 120, 'D'],
  ['gazpacho', 'Gazpacho', '🍅', 50, 0.9, 4.5, 3.3, 1, 3.5, 0.5, '1 vaso', 250, 'A', 'ml'],
  ['ensalada-mixta', 'Ensalada mixta', '🥗', 70, 3, 4, 4.5, 1.8, 2.5, 0.7, '1 plato', 250, 'A'],
  // Frutas
  ['manzana', 'Manzana', '🍎', 52, 0.3, 14, 0.2, 2.4, 10.4, 0, '1 manzana', 180, 'A'],
  ['platano', 'Plátano', '🍌', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 0.1, '1 plátano', 120, 'A'],
  ['naranja', 'Naranja', '🍊', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, '1 naranja', 180, 'A'],
  ['mandarina', 'Mandarina', '🍊', 53, 0.8, 13.3, 0.3, 1.8, 10.6, 0, '1 mandarina', 80, 'A'],
  ['fresas', 'Fresas', '🍓', 32, 0.7, 7.7, 0.3, 2, 4.9, 0, '1 bol', 150, 'A'],
  ['frambuesas', 'Frambuesas', '🫐', 52, 1.2, 11.9, 0.7, 6.5, 4.4, 0, '1 puñado', 80, 'A'],
  ['arandanos', 'Arándanos', '🫐', 57, 0.7, 14.5, 0.3, 2.4, 10, 0, '1 puñado', 80, 'A'],
  ['kiwi', 'Kiwi', '🥝', 61, 1.1, 14.7, 0.5, 3, 9, 0, '1 kiwi', 75, 'A'],
  ['pera', 'Pera', '🍐', 57, 0.4, 15.2, 0.1, 3.1, 9.8, 0, '1 pera', 170, 'A'],
  ['uvas', 'Uvas', '🍇', 69, 0.7, 18, 0.2, 0.9, 15.5, 0, '1 racimo', 120, 'B'],
  ['sandia', 'Sandía', '🍉', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 0, '1 tajada', 250, 'A'],
  ['melon', 'Melón', '🍈', 34, 0.8, 8.2, 0.2, 0.9, 7.9, 0, '1 tajada', 200, 'A'],
  ['pina', 'Piña', '🍍', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 0, '2 rodajas', 150, 'A'],
  ['aguacate', 'Aguacate', '🥑', 160, 2, 8.5, 14.7, 6.7, 0.7, 2.1, '½ aguacate', 70, 'A'],
  // Frutos secos, grasas y extras
  ['nueces', 'Nueces', '🌰', 654, 15, 14, 65, 6.7, 2.6, 6.1, '1 puñado', 25, 'A'],
  ['almendras', 'Almendras', '🌰', 579, 21, 22, 50, 12.5, 4.4, 3.8, '1 puñado', 25, 'A'],
  ['cacahuetes', 'Cacahuetes tostados', '🥜', 585, 24, 16, 49, 8, 4, 7, '1 puñado', 25, 'B'],
  ['crema-cacahuete', 'Crema de cacahuete 100%', '🥜', 600, 25, 12, 50, 8, 4, 9, '1 cucharada', 15, 'B'],
  ['aceite-oliva', 'Aceite de oliva virgen extra', '🫒', 884, 0, 0, 100, 0, 0, 14, '1 cucharada', 10, 'B', 'ml'],
  ['mantequilla', 'Mantequilla', '🧈', 717, 0.9, 0.1, 81, 0, 0.1, 51, '1 porción', 10, 'E'],
  ['aceitunas', 'Aceitunas', '🫒', 145, 1, 3.8, 15, 3.3, 0, 2, '10 aceitunas', 40, 'C'],
  ['chia', 'Semillas de chía', '🌱', 486, 17, 42, 31, 34, 0, 3.3, '1 cucharada', 12, 'A'],
  ['miel', 'Miel', '🍯', 304, 0.3, 82, 0, 0.2, 82, 0, '1 cucharada', 20, 'D'],
  ['mermelada', 'Mermelada', '🍓', 250, 0.4, 60, 0.1, 1, 55, 0, '1 cucharada', 20, 'D'],
  ['chocolate-negro', 'Chocolate negro 85%', '🍫', 600, 10, 20, 50, 13, 12, 30, '2 onzas', 20, 'C'],
  ['chocolate-leche', 'Chocolate con leche', '🍫', 535, 7.6, 59, 30, 3.4, 52, 18, '2 onzas', 20, 'E'],
  ['galletas', 'Galletas tipo María', '🍪', 440, 7, 74, 12, 2.5, 22, 5, '4 galletas', 28, 'D'],
  ['bolleria', 'Bollería (croissant, napolitana…)', '🥐', 420, 7, 46, 23, 2, 15, 12, '1 unidad', 70, 'E'],
  ['patatas-chips', 'Patatas chips', '🥔', 536, 6.6, 53, 34, 4.4, 0.3, 3, '1 bolsa pequeña', 40, 'E'],
  ['helado', 'Helado', '🍨', 207, 3.5, 24, 11, 0.7, 21, 6.8, '1 bola', 70, 'E'],
  // Platos preparados habituales
  ['tortilla-patata', 'Tortilla de patata', '🍳', 160, 6, 12, 10, 1.2, 1, 2, '1 pincho', 120, 'C'],
  ['paella', 'Paella mixta', '🥘', 160, 9, 20, 5, 1, 0.8, 1.2, '1 plato', 300, 'B'],
  ['pizza', 'Pizza', '🍕', 266, 11, 33, 10, 2.3, 3.6, 4.5, '2 porciones', 200, 'D'],
  ['hamburguesa', 'Hamburguesa completa', '🍔', 254, 13, 24, 12, 1.5, 5, 4.5, '1 hamburguesa', 220, 'D'],
  ['bocadillo-jamon', 'Bocadillo de jamón', '🥖', 270, 14, 38, 7, 2, 2.5, 2, '1 bocadillo', 160, 'C'],
  ['croquetas', 'Croquetas', '🧆', 230, 7, 22, 13, 1, 2, 4, '4 croquetas', 120, 'D'],
  ['sushi', 'Sushi variado', '🍣', 150, 6, 28, 1.5, 0.8, 5, 0.3, '8 piezas', 200, 'B'],
  ['cocido', 'Cocido madrileño', '🍲', 140, 10, 10, 7, 3.5, 1, 2.3, '1 plato', 350, 'B'],
  ['pollo-patata-esparragos', 'Pollo con patata y espárragos', '🍽️', 110, 12, 9, 2.6, 1.8, 0.7, 0.6, '1 plato', 330, 'A'],
  // Bebidas
  ['agua', 'Agua', '💧', 0, 0, 0, 0, 0, 0, 0, '1 vaso', 250, 'A', 'ml'],
  ['cafe-solo', 'Café solo', '☕', 2, 0.1, 0, 0, 0, 0, 0, '1 taza', 60, 'A', 'ml'],
  ['cafe-leche', 'Café con leche (semi)', '☕', 30, 2, 3, 1, 0, 3, 0.6, '1 taza', 200, 'A', 'ml'],
  ['te', 'Té / infusión', '🍵', 1, 0, 0.2, 0, 0, 0, 0, '1 taza', 250, 'A', 'ml'],
  ['zumo-naranja', 'Zumo de naranja natural', '🧃', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 0, '1 vaso', 200, 'C', 'ml'],
  ['refresco', 'Refresco azucarado', '🥤', 42, 0, 10.6, 0, 0, 10.6, 0, '1 lata', 330, 'E', 'ml'],
  ['refresco-zero', 'Refresco zero', '🥤', 0.4, 0, 0, 0, 0, 0, 0, '1 lata', 330, 'C', 'ml'],
  ['cerveza', 'Cerveza', '🍺', 43, 0.5, 3.6, 0, 0, 0, 0, '1 caña', 200, 'D', 'ml'],
  ['cerveza-sin', 'Cerveza sin alcohol', '🍺', 21, 0.3, 4.7, 0, 0, 3, 0, '1 lata', 330, 'C', 'ml'],
  ['vino-tinto', 'Vino tinto', '🍷', 85, 0.1, 2.6, 0, 0, 0.6, 0, '1 copa', 150, 'D', 'ml'],
  ['batido-proteina', 'Batido de proteína (whey con agua)', '🥤', 120, 24, 3, 1.5, 0, 2, 0.8, '1 cacito', 30, 'A']
];

export const BASE_FOODS: Food[] = [...ROWS, ...EXTRA_ROWS].map(([id, name, emoji, kcal, protein, carbs, fat, fiber, sugar, satFat, servingLabel, servingGrams, grade, unit]) => ({
  id: `base:${id}`,
  name,
  emoji,
  unit: unit ?? 'g',
  per100: { kcal, protein, carbs, fat, fiber, sugar, satFat },
  serving: servingLabel && servingGrams ? { label: servingLabel, grams: servingGrams } : undefined,
  grade,
  source: 'base'
}));

/** Normaliza para buscar sin tildes ni mayúsculas: “Plátano” ≈ “platano” */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function searchFoods(query: string, pool: Food[]): Food[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(/\s+/);
  return pool
    .map((f) => {
      const n = normalize(`${f.name} ${f.brand ?? ''}`);
      if (!terms.every((t) => n.includes(t))) return null;
      const score = n.startsWith(q) ? 0 : n.split(/\s+/).some((w) => w.startsWith(terms[0])) ? 1 : 2;
      return { f, score };
    })
    .filter((x): x is { f: Food; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.f.name.length - b.f.name.length)
    .map((x) => x.f);
}
