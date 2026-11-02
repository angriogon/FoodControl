// ─────────────── Comparación de palabras para buscar alimentos ───────────────
// Lo comparten el buscador y el registro por texto. Todo trabaja sobre texto
// ya normalizado (minúsculas, sin tildes).

/** Plural → singular, suficiente para emparejar palabras: “plátanos” ≈ “plátano”, “limones” ≈ “limón”, “nueces” ≈ “nuez” */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ces')) return `${w.slice(0, -3)}z`;
  if (w.length > 4 && /[nrldj]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

/**
 * Sinónimos y variantes regionales o de marca → palabra que usa la base.
 * Solo palabras sueltas (ya en singular y sin tildes).
 */
const SYNONYMS: Record<string, string> = {
  papa: 'patata', habichuela: 'judia', frijol: 'alubia', poroto: 'alubia', judion: 'alubia',
  bocata: 'bocadillo', bocadillito: 'bocadillo', sandwich: 'sandwich', sanwich: 'sandwich',
  yogurt: 'yogur', yoghurt: 'yogur', yogourt: 'yogur',
  jugo: 'zumo', durazno: 'melocoton', palta: 'aguacate', mani: 'cacahuete', choclo: 'maiz', elote: 'maiz',
  beicon: 'bacon', bacon: 'bacon', panceta: 'bacon',
  colacao: 'cacao', nesquik: 'cacao', nocilla: 'crema', nutella: 'crema',
  coca: 'refresco', cocacola: 'refresco', cola: 'refresco', fanta: 'refresco', soda: 'refresco',
  birra: 'cerveza', tercio: 'cerveza', quinto: 'cerveza',
  burger: 'hamburguesa', hamburgesa: 'hamburguesa', pizza: 'pizza',
  whey: 'proteina', prote: 'proteina', infusion: 'te', manzanilla: 'te', poleo: 'te',
  espagueti: 'espaguetis', spaghetti: 'espaguetis', spagueti: 'espaguetis', macarron: 'macarrones',
  croisan: 'bolleria', cruasan: 'bolleria', croissant: 'bolleria', napolitana: 'bolleria', bollo: 'bolleria',
  tostada: 'tostada', biscote: 'biscote', galleta: 'galleta', magdalena: 'magdalena',
  leche: 'leche', semi: 'semidesnatada', desnatada: 'desnatada', entera: 'entera',
  plancha: 'plancha', aove: 'oliva', huevito: 'huevo', huevo: 'huevo',
  platano: 'platano', banana: 'platano', banano: 'platano', guineo: 'platano',
  frutilla: 'fresa', fresón: 'fresa', freson: 'fresa', ananas: 'pina', anana: 'pina',
  arandano: 'arandano', mandarina: 'mandarina', clementina: 'mandarina',
  calabacin: 'calabacin', zucchini: 'calabacin', berenjena: 'berenjena',
  pechuguita: 'pechuga', filetito: 'filete', bistec: 'ternera', bife: 'ternera', chuleta: 'chuleta'
};

/** Formas equivalentes de una palabra: ella misma, su singular y su sinónimo */
export function variants(term: string): string[] {
  const s = stem(term);
  const out = new Set([term, s]);
  const syn = SYNONYMS[term] ?? SYNONYMS[s];
  if (syn) {
    out.add(syn);
    out.add(stem(syn));
  }
  return [...out];
}

/**
 * ¿Están dos palabras a una errata de distancia? (una letra cambiada,
 * sobrante, que falta o dos letras intercambiadas). Solo para palabras de 4+
 * letras: en palabras cortas una errata cambia de alimento (“pan” → “pas”).
 */
export function oneTypo(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    // Sustitución o intercambio de dos letras seguidas
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  // Letra de más o de menos
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
