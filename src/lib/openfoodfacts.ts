import type { Food, QualityGrade } from '../types';

// Open Food Facts: base de datos abierta y gratuita (sin API key) con millones
// de productos envasados. Permite CORS, así que se consulta directamente.
// Solo funciona con conexión; los productos usados se guardan en “recientes”.

const FIELDS = 'code,product_name,product_name_es,brands,nutriments,nutriscore_grade,serving_quantity,serving_size,quantity';

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  nutriscore_grade?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function toFood(p: OffProduct): Food | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name_es || p.product_name || '').trim();
  let kcal = num(n['energy-kcal_100g']);
  if (!kcal && n['energy_100g']) kcal = num(n['energy_100g']) / 4.184; // kJ → kcal
  if (!name || !kcal || !p.code) return null;
  const grade = (p.nutriscore_grade ?? '').toUpperCase();
  const servingGrams = num(p.serving_quantity);
  return {
    id: `off:${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    unit: 'g',
    per100: {
      kcal: Math.round(kcal),
      protein: num(n['proteins_100g']),
      carbs: num(n['carbohydrates_100g']),
      fat: num(n['fat_100g']),
      fiber: num(n['fiber_100g']),
      sugar: num(n['sugars_100g']),
      satFat: num(n['saturated-fat_100g']),
      salt: num(n['salt_100g'])
    },
    serving: servingGrams > 0 ? { label: p.serving_size || `1 ración`, grams: servingGrams } : undefined,
    grade: (['A', 'B', 'C', 'D', 'E'].includes(grade) ? grade : undefined) as QualityGrade | undefined,
    source: 'off',
    emoji: '🛒'
  };
}

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.search = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    lc: 'es',
    cc: 'es',
    fields: FIELDS
  }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? []).map(toFood).filter((f): f is Food => f !== null);
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 8) return null;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return toFood({ ...data.product, code: data.product.code ?? clean });
}
