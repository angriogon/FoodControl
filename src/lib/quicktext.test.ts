import { describe, expect, test } from 'vitest';
import type { Menu } from '../types';
import { BASE_FOODS } from './foods';
import { BASE_RECIPES } from './base-recipes';
import { recipeToFood } from './recipes';
import { MAX_TEXT, parseQuantity, parseQuickText, stem, swapFood } from './quicktext';

const pool = [...BASE_RECIPES.map(recipeToFood), ...BASE_FOODS];
const byId = (id: string) => BASE_FOODS.find((f) => f.id === `base:${id}`)!;
const parse = (t: string, opts = {}) => parseQuickText(t, pool, opts);
const brief = (t: string) => parse(t).map((i) => [i.food?.id ?? null, i.amount]);

describe('Registro rápido por texto', () => {
  test('frase típica con varias cantidades y medidas caseras', () => {
    expect(brief('200 g de pollo, 150 g de arroz y una cucharada de aceite')).toEqual([
      ['base:pechuga-pollo', 200], ['base:arroz-cocido', 150], ['base:aceite-oliva', 10]
    ]);
  });

  test('unidades sueltas usan el peso de la ración del alimento', () => {
    expect(brief('2 huevos')).toEqual([['base:huevo', 110]]);
    expect(brief('un plátano')).toEqual([['base:platano', 120]]);
    // La ración es “½ aguacate” = 70 g → un aguacate entero son 140 g y medio, 70 g
    expect(brief('medio aguacate')).toEqual([['base:aguacate', 70]]);
    expect(brief('un aguacate')).toEqual([['base:aguacate', 140]]);
    expect(brief('1 y medio plátanos')).toEqual([['base:platano', 180]]);
    expect(brief('2 lonchas de jamón serrano')).toEqual([['base:jamon-serrano', 20]]);
  });

  test('cantidad detrás, pegada o sin unidad', () => {
    expect(brief('pollo 200g')).toEqual([['base:pechuga-pollo', 200]]);
    expect(brief('arroz 150')).toEqual([['base:arroz-cocido', 150]]);
    expect(brief('pechuga de pollo a la plancha 180 g')).toEqual([['base:pechuga-pollo', 180]]);
    expect(brief('zumo de naranja 200 ml')[0][1]).toBe(200);
  });

  test('decimales con coma, kilos y litros', () => {
    expect(parse('1,5 kg de sandía')[0].amount).toBe(1500);
    expect(parse('0,5 l de leche')[0].amount).toBe(500);
    // Una coma seguida de espacio separa elementos, no es un decimal
    expect(brief('arroz 150, 2 huevos')).toEqual([['base:arroz-cocido', 150], ['base:huevo', 110]]);
  });

  test('sin cantidad: una ración, marcada como estimada', () => {
    const [i] = parse('lentejas');
    expect(i.food?.id).toBe('base:lentejas');
    expect(i.amount).toBe(byId('lentejas').serving!.grams);
    expect(i.estimated).toBe(true);
  });

  test('“con” y “y” no rompen nombres que existen', () => {
    expect(brief('café con leche')).toEqual([['base:cafe-leche', 200]]);
    const two = parse('yogur natural con nueces');
    expect(two.map((i) => i.food?.id)).toEqual(['base:yogur-natural', 'base:nueces']);
  });

  test('saltos de línea y punto final separan elementos', () => {
    expect(parse('un kiwi\nun yogur.').map((i) => i.food?.id)).toEqual(['base:kiwi', 'base:yogur-natural']);
  });

  test('lo que no reconoce queda pendiente, sin inventar', () => {
    const [i] = parse('xyzzy 100 g');
    expect(i.food).toBeNull();
    expect(i.query).toBe('xyzzy');
  });

  test('se prefieren los alimentos que ya usas', () => {
    expect(parse('arroz', { preferred: ['base:arroz-integral'] })[0].food?.id).toBe('base:arroz-integral');
    expect(parse('leche', { preferred: ['base:leche-entera'] })[0].food?.id).toBe('base:leche-entera');
  });

  test('un menú guardado se expande con sus cantidades', () => {
    const menu: Menu = {
      id: 'm1', name: 'Desayuno de diario', emoji: '☀️', meal: 'desayuno', createdAt: '', uses: 3,
      items: [{ food: byId('cafe-leche'), amount: 200 }, { food: byId('pan-integral'), amount: 60 }]
    };
    const r = parse('desayuno de diario', { menus: [menu] });
    expect(r.map((i) => [i.food?.id, i.amount, i.menu])).toEqual([
      ['base:cafe-leche', 200, 'Desayuno de diario'], ['base:pan-integral', 60, 'Desayuno de diario']
    ]);
    expect(parse('2 desayuno de diario', { menus: [menu] }).map((i) => i.amount)).toEqual([400, 120]);
  });

  test('cambiar de alimento recalcula las unidades', () => {
    const [i] = parse('2 huevos');
    const swapped = swapFood(i, byId('clara-huevo'));
    expect(swapped.amount).toBe(66);
    expect(swapped.alternatives[0].id).toBe('base:huevo');
    // Si se dieron gramos, se mantienen los gramos
    const [g] = parse('200 g de pollo');
    expect(swapFood(g, byId('ternera')).amount).toBe(200);
  });

  test('límites: texto vacío, solo números, texto enorme', () => {
    expect(parse('')).toEqual([]);
    expect(parse('  , ; \n ')).toEqual([]);
    expect(parse('200 g')).toEqual([]);
    const huge = Array.from({ length: 500 }, () => 'manzana').join(', ');
    const r = parse(huge);
    expect(r.length).toBeLessThanOrEqual(40);
    expect(huge.length).toBeGreaterThan(MAX_TEXT);
  });

  test('el fragmento original conserva las tildes', () => {
    expect(parse('Un plátano y 2 limones').map((i) => i.source)).toEqual(['un plátano', '2 limones']);
  });

  test('utilidades: plurales y cantidades', () => {
    expect(['platanos', 'limones', 'nueces', 'huevos', 'pan'].map(stem)).toEqual(['platano', 'limon', 'nuez', 'huevo', 'pan']);
    expect(parseQuantity('un par de huevos').qty.n).toBe(2);
    expect(parseQuantity('una cucharada de aceite').qty.unit).toBe('cucharada');
  });
});
