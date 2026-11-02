import type { Food, Menu, Portion } from '../types';
import { normalize } from './foods';

// ─────────────── Registro rápido por texto ───────────────
// Convierte un texto libre ("200 g de pollo, un plátano y una cucharada de
// aceite") en una lista de alimentos con cantidad, usando solo la base local.
// No hay IA ni conexión: reglas simples y predecibles. El resultado siempre
// pasa por una pantalla de revisión, así que aquí se prioriza que sea fácil
// de corregir sobre acertar el 100 %.

/** Cantidad tal y como la escribió el usuario, antes de convertirla a gramos */
export interface QtySpec {
  /** Número indicado (2 huevos → 2). Sin número = 1 */
  n: number;
  /** Unidad normalizada: 'g', 'ml' o una medida casera ('cucharada', 'vaso'…). Sin unidad = undefined */
  unit?: string;
  /** El usuario no indicó cantidad: se usa la ración habitual */
  implicit: boolean;
}

export interface QuickItem {
  /** Fragmento del texto original del que sale este elemento */
  source: string;
  /** Nombre buscado (sin cantidades) */
  query: string;
  food: Food | null;
  amount: number;
  qty: QtySpec;
  /** Otras opciones parecidas para cambiar con un toque */
  alternatives: Food[];
  /** 'alta' = coinciden todas las palabras; 'baja' = coincidencia parcial, conviene revisar */
  confidence: 'alta' | 'baja';
  /** La cantidad no la dio el usuario (ración habitual o 100 g por defecto) */
  estimated: boolean;
  /** Si procede de un menú guardado, su nombre */
  menu?: string;
}

export const MAX_TEXT = 1000;
const MAX_ITEMS = 40;

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'con', 'y', 'e', 'a', 'al', 'en', 'mi', 'mis', 'para', 'sin']);

const WORD_NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  doce: 12, quince: 15, veinte: 20, medio: 0.5, media: 0.5, cuarto: 0.25
};

/** Unidades de masa/volumen: factor a g o ml */
const METRIC: Record<string, { unit: 'g' | 'ml'; f: number }> = {
  g: { unit: 'g', f: 1 }, gr: { unit: 'g', f: 1 }, grs: { unit: 'g', f: 1 }, gramo: { unit: 'g', f: 1 }, gramos: { unit: 'g', f: 1 },
  kg: { unit: 'g', f: 1000 }, kilo: { unit: 'g', f: 1000 }, kilos: { unit: 'g', f: 1000 },
  ml: { unit: 'ml', f: 1 }, mililitro: { unit: 'ml', f: 1 }, mililitros: { unit: 'ml', f: 1 },
  cl: { unit: 'ml', f: 10 }, l: { unit: 'ml', f: 1000 }, litro: { unit: 'ml', f: 1000 }, litros: { unit: 'ml', f: 1000 }
};

/**
 * Medidas caseras: gramos por unidad si el alimento no trae una ración con esa
 * medida. Si la trae (aceite: “1 cucharada” = 10 g), manda la del alimento.
 * `undefined` = usar la ración del alimento.
 */
const HOUSEHOLD: Record<string, number | undefined> = {
  cucharada: 15, cda: 15, cucharadita: 5, cdta: 5, cucharon: 120,
  vaso: 250, taza: 250, tazon: 300, bol: 250, cuenco: 250, plato: 250, copa: 150, cana: 200, botella: 330, botellin: 250,
  rebanada: 30, loncha: 15, filete: 150, trozo: 60, punado: 30, pizca: 1, chorro: 10, onza: 10, lata: undefined,
  racion: undefined, porcion: undefined, unidad: undefined, pieza: undefined, pincho: undefined, tarrina: undefined, cacito: undefined
};
const HOUSEHOLD_ALIASES: Record<string, string> = { cucharadas: 'cucharada', cdas: 'cda', cucharaditas: 'cucharadita', cdtas: 'cdta', unidades: 'unidad', uds: 'unidad', ud: 'unidad' };

/** Plural → singular, suficiente para emparejar palabras: “plátanos” ≈ “plátano”, “limones” ≈ “limón”, “nueces” ≈ “nuez” */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ces')) return `${w.slice(0, -3)}z`;
  if (w.length > 4 && /[nrldj]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

function unitKey(w: string): string | undefined {
  const a = HOUSEHOLD_ALIASES[w] ?? w;
  if (a in HOUSEHOLD) return a;
  const s = stem(a);
  if (s in HOUSEHOLD) return s;
  return undefined;
}

/** Palabras significativas del nombre de un alimento (sin lo que va entre paréntesis ni palabras vacías) */
function nameWords(name: string): { core: string[]; all: string[] } {
  const n = normalize(name);
  const core = n.replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9ñ%]+/).filter((w) => w && !STOP.has(w)).map(stem);
  const all = n.split(/[^a-z0-9ñ%]+/).filter((w) => w && !STOP.has(w)).map(stem);
  return { core, all };
}

function wordMatches(term: string, word: string): boolean {
  if (term === word) return true;
  // Prefijo: “semi” → “semidesnatada”, “yogur” → “yogures”
  return term.length >= 4 && word.startsWith(term);
}

/**
 * Lo que se suele querer decir en España con una sola palabra. Solo desempata:
 * si ya has usado otro alimento parecido, gana el tuyo (ver `preferred`).
 */
const DEFAULTS: Record<string, string> = {
  aceite: 'base:aceite-oliva', leche: 'base:leche-semi', pollo: 'base:pechuga-pollo', tostada: 'base:pan-blanco',
  cafe: 'base:cafe-leche', queso: 'base:queso-fresco', atun: 'base:atun-natural', yogur: 'base:yogur-natural'
};

interface Candidate { food: Food; score: number; full: boolean }

/** Prepara la búsqueda una sola vez por análisis (el pool tiene cientos de alimentos) */
function indexPool(pool: Food[]) {
  return pool.map((food, i) => ({ food, i, ...nameWords(`${food.name} ${food.brand ?? ''}`) }));
}
type Indexed = ReturnType<typeof indexPool>;

/**
 * Busca el alimento que mejor encaja con unas palabras.
 * Puntuación (menor = mejor): palabras sobrantes del nombre, +1 si no empieza
 * por la primera palabra buscada, +1,5 si es un plato (al escribir “pollo”
 * se espera pollo, no “Pollo al horno con patatas”), −4 si ya lo has usado (por encima de los valores por defecto).
 */
function rank(terms: string[], index: Indexed, preferred: Set<string>): Candidate[] {
  if (!terms.length) return [];
  const out: Candidate[] = [];
  for (const { food, core, all } of index) {
    // Valor por defecto aunque el nombre no contenga la palabra (“tostada” → pan)
    if (terms.length === 1 && DEFAULTS[terms[0]] === food.id) { out.push({ food, score: -3, full: true }); continue; }
    const matched = terms.filter((t) => all.some((w) => wordMatches(t, w)));
    if (!matched.length) continue;
    const full = matched.length === terms.length;
    // Coincidencia parcial: exige al menos la primera palabra (suele ser el sustantivo) y la mitad de las palabras
    if (!full && (!matched.includes(terms[0]) || matched.length < Math.ceil(terms.length / 2))) continue;
    const extra = core.filter((w) => !terms.some((t) => wordMatches(t, w))).length;
    // Coincidencia exacta mejor que por prefijo (“semi” → “semidesnatada” vale, pero cuenta menos)
    const prefixOnly = terms.filter((t) => !all.includes(t) && all.some((w) => wordMatches(t, w))).length;
    let score = extra + prefixOnly * 0.5;
    if (!core.length || !wordMatches(terms[0], core[0])) score += 1;
    if (food.source === 'recipe' && extra > 0) score += 1.5;
    if (preferred.has(food.id)) score -= 4;
    if (!full) score += 10 + (terms.length - matched.length) * 2;
    out.push({ food, score, full });
  }
  return out.sort((a, b) => a.score - b.score);
}

/** Separa “200g”, “1,5l”, “½” y fracciones para poder leer la cantidad */
function prepare(text: string): string {
  return normalize(text)
    .replace(/½/g, ' 0.5 ').replace(/¼/g, ' 0.25 ').replace(/¾/g, ' 0.75 ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => (Number(b) ? String(Number(a) / Number(b)) : a))
    .replace(/(\d)([a-zñ])/g, '$1 $2')
    // “uno y medio”, “2 y media” → 1.5 / 2.5 (antes de separar por “y”)
    .replace(/\b(\d+(?:\.\d+)?|un|una|uno|dos|tres|cuatro|cinco)\s+y\s+medi[oa]\b/g, (_, a) => String((WORD_NUMBERS[a] ?? Number(a)) + 0.5))
    .replace(/[()]/g, ' ');
}

function readNumber(tok: string | undefined): number | undefined {
  if (!tok) return undefined;
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  return WORD_NUMBERS[tok];
}

interface Parsed { qty: QtySpec; metric?: { unit: 'g' | 'ml'; value: number }; name: string[] }

/** Extrae la cantidad (al principio o al final) y deja las palabras del nombre */
export function parseQuantity(segment: string): Parsed {
  let toks = segment.split(/\s+/).filter(Boolean);
  let n: number | undefined;
  let unit: string | undefined;
  let metric: Parsed['metric'];

  const takeUnit = (i: number): number => {
    const t = toks[i];
    if (!t) return 0;
    if (t in METRIC) { metric = { unit: METRIC[t].unit, value: (n ?? 1) * METRIC[t].f }; return 1; }
    const h = unitKey(t);
    if (h) { unit = h; return 1; }
    return 0;
  };

  // “un par de huevos”
  if ((toks[0] === 'un' || toks[0] === 'una') && toks[1] === 'par') { n = 2; toks = toks.slice(2); }
  // Cantidad delante: “200 g de pollo”, “2 huevos”, “media pechuga”, “una cucharada de aceite”
  else {
    const first = readNumber(toks[0]);
    if (first !== undefined) {
      n = first;
      toks = toks.slice(1 + takeUnit(1));
    } else if (takeUnit(0)) {
      // “cucharada de aceite”, “g de arroz” (sin número)
      toks = toks.slice(1);
    }
  }
  // Cantidad detrás: “pollo 200 g”, “pollo 200g”, “arroz 150”
  if (n === undefined && !metric) {
    const last = toks.length - 1;
    const prev = readNumber(toks[last - 1]);
    const lastNum = readNumber(toks[last]);
    if (prev !== undefined && last >= 1 && (toks[last] in METRIC || unitKey(toks[last]))) {
      n = prev;
      const t = toks[last];
      toks = toks.slice(0, last - 1);
      if (t in METRIC) metric = { unit: METRIC[t].unit, value: n * METRIC[t].f };
      else unit = unitKey(t);
    } else if (lastNum !== undefined && last >= 1 && /^\d/.test(toks[last])) {
      n = lastNum;
      toks = toks.slice(0, last);
    }
  }
  // Número suelto grande sin unidad (“pollo 200”, “200 pollo”) = gramos
  if (!metric && !unit && n !== undefined && n >= 20) metric = { unit: 'g', value: n };

  const name = toks.filter((t) => !STOP.has(t) && !/^\d/.test(t)).map(stem);
  return { qty: { n: n ?? 1, unit: metric ? metric.unit : unit, implicit: n === undefined && !unit && !metric }, metric, name };
}

/** Lee “2 huevos” / “1 cucharada” / “½ pechuga” de la ración de un alimento */
function servingInfo(food: Food): { count: number; word?: string } | null {
  const s = food.serving;
  if (!s || s.grams <= 0) return null;
  const toks = prepare(s.label).split(/\s+/).filter(Boolean);
  const c = readNumber(toks[0]);
  const rest = c === undefined ? toks : toks.slice(1);
  const word = rest.find((t) => !STOP.has(t));
  return { count: c && c > 0 ? c : 1, word: word ? stem(word) : undefined };
}

/** Convierte la cantidad escrita en gramos/ml para un alimento concreto */
export function resolveAmount(food: Food, qty: QtySpec, metric?: { value: number }): { amount: number; estimated: boolean } {
  const round = (v: number) => Math.max(1, Math.round(v));
  if (metric) return { amount: round(metric.value), estimated: false };
  if ((qty.unit === 'g' || qty.unit === 'ml')) return { amount: round(qty.n), estimated: false };
  const sv = servingInfo(food);
  const perUnit = sv ? food.serving!.grams / sv.count : undefined;
  if (qty.unit) {
    // Medida casera: si la ración del alimento usa esa misma medida, manda la del alimento
    if (sv && perUnit && sv.word && (sv.word === qty.unit || sv.word.startsWith(qty.unit) || qty.unit.startsWith(sv.word))) {
      return { amount: round(qty.n * perUnit), estimated: false };
    }
    const g = HOUSEHOLD[qty.unit];
    if (g !== undefined) return { amount: round(qty.n * g), estimated: false };
    // Ración/unidad/lata… sin dato propio: la ración del alimento
    if (perUnit) return { amount: round(qty.n * perUnit), estimated: false };
    return { amount: round(qty.n * 100), estimated: true };
  }
  // Sin unidad: “2 huevos”, “un plátano” o nada (= una ración)
  if (perUnit) return { amount: round(qty.n * (qty.implicit ? food.serving!.grams : perUnit)), estimated: qty.implicit };
  return { amount: round(qty.n * 100), estimated: true };
}

/** Divide el texto en fragmentos: comas, saltos de línea, “;”, “+” */
function splitSegments(text: string): string[] {
  return text.split(/[,;\n+]+|\s+\.\s+|\.\s*$/).map((s) => s.trim()).filter(Boolean);
}

function menuMatch(name: string[], menus: Menu[]): Menu | undefined {
  if (!name.length) return undefined;
  return menus.find((m) => {
    const w = nameWords(m.name).all;
    return w.length === name.length && name.every((t) => w.some((x) => x === t || wordMatches(t, x)));
  });
}

export interface ParseOptions {
  /** Ids de alimentos que el usuario ya usa (recientes, propios): se prefieren */
  preferred?: Iterable<string>;
  menus?: Menu[];
}

/**
 * Analiza el texto completo. Primero intenta cada fragmento entero (“café con
 * leche” es un alimento); si no encaja, lo parte por “y”/“con” (“pollo con
 * arroz” son dos).
 */
export function parseQuickText(text: string, pool: Food[], opts: ParseOptions = {}): QuickItem[] {
  const index = indexPool(pool);
  const preferred = new Set(opts.preferred ?? []);
  const menus = opts.menus ?? [];
  const items: QuickItem[] = [];

  const build = (source: string, p: Parsed): QuickItem[] | null => {
    const m = menuMatch(p.name, menus);
    if (m) {
      const factor = p.qty.implicit || p.metric ? 1 : p.qty.n;
      return m.items.map((it: Portion) => ({
        source, query: it.food.name, food: it.food, amount: Math.max(1, Math.round(it.amount * factor)),
        qty: { n: Math.round(it.amount * factor), unit: it.food.unit, implicit: false },
        alternatives: [], confidence: 'alta', estimated: false, menu: m.name
      }));
    }
    const ranked = rank(p.name, index, preferred);
    const best = ranked[0];
    const query = p.name.join(' ');
    if (!best) return null;
    const { amount, estimated } = resolveAmount(best.food, p.qty, p.metric);
    return [{
      source, query, food: best.food, amount, qty: p.qty, estimated, confidence: best.full ? 'alta' : 'baja',
      alternatives: ranked.slice(1, 6).map((c) => c.food)
    }];
  };

  const unmatched = (source: string, p: Parsed): QuickItem => ({
    source, query: p.name.join(' '), food: null, amount: 0, qty: p.qty, alternatives: [], confidence: 'baja', estimated: true
  });

  // Para mostrar el fragmento con sus tildes (“plátano”, no “platano”)
  const original = new Map<string, string>();
  for (const w of text.slice(0, MAX_TEXT).toLowerCase().split(/[\s,;+()]+/)) if (w) original.set(normalize(w), w);
  const pretty = (seg: string) => seg.split(' ').map((w) => original.get(w) ?? w).join(' ');

  for (const raw of splitSegments(prepare(text.slice(0, MAX_TEXT)))) {
    if (items.length >= MAX_ITEMS) break;
    const whole = parseQuantity(raw);
    if (!whole.name.length) continue;
    const direct = build(pretty(raw), whole);
    if (direct && direct[0].confidence === 'alta') { items.push(...direct); continue; }

    // Partir por “y” / “con” / “e” y analizar cada trozo
    const parts = raw.split(/\s+(?:y|e|con)\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        const p = parseQuantity(part);
        if (!p.name.length) continue;
        items.push(...(build(pretty(part), p) ?? [unmatched(pretty(part), p)]));
      }
      continue;
    }
    items.push(...(direct ?? [unmatched(pretty(raw), whole)]));
  }
  return items.slice(0, MAX_ITEMS);
}

/** Recalcula la cantidad al cambiar de alimento (2 huevos → 2 unidades del nuevo alimento) */
export function swapFood<T extends QuickItem>(item: T, food: Food): T {
  const metric = item.qty.unit === 'g' || item.qty.unit === 'ml' ? { value: item.amount } : undefined;
  const { amount, estimated } = resolveAmount(food, item.qty, metric);
  return { ...item, food, amount, estimated, confidence: 'alta', alternatives: [item.food, ...item.alternatives].filter((f): f is Food => !!f && f.id !== food.id) };
}
