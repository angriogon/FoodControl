import { useEffect, useMemo, useRef, useState } from 'react';
import type { Food } from '../types';
import { useAppState, useUsage } from '../store/store';
import { BASE_FOODS, searchFoods } from '../lib/foods';
import { BASE_RECIPES } from '../lib/base-recipes';
import { recipeToFood } from '../lib/recipes';
import { searchOpenFoodFacts } from '../lib/openfoodfacts';
import { FoodRow } from './FoodSheets';

/** Platos del usuario y de la casa convertidos en “alimentos” buscables */
export function useRecipeFoods(): Food[] {
  const { recipes } = useAppState();
  return useMemo(() => [...recipes, ...BASE_RECIPES].map(recipeToFood), [recipes]);
}

/** Todo lo que se puede buscar sin conexión, sin duplicados (lo propio primero) */
export function useFoodPool(): Food[] {
  const state = useAppState();
  const recipeFoods = useRecipeFoods();
  return useMemo(() => {
    const seen = new Set<string>();
    return [...state.customFoods, ...recipeFoods, ...state.recentFoods, ...BASE_FOODS].filter((f) =>
      seen.has(f.id) ? false : (seen.add(f.id), true)
    );
  }, [state.customFoods, state.recentFoods, recipeFoods]);
}

export function useLocalSearch(query: string, limit = 40): Food[] {
  const pool = useFoodPool();
  const usage = useUsage();
  return useMemo(() => searchFoods(query, pool, (id) => usage.get(id)?.uses ?? 0).slice(0, limit), [query, pool, limit, usage]);
}

interface OnlineState {
  loading: boolean;
  results: Food[];
  error?: string;
  done: boolean;
}

/** Búsqueda en Open Food Facts bajo demanda (nunca automática: respeta sus límites) */
export function useOnlineSearch(query: string) {
  const [state, setState] = useState<OnlineState>({ loading: false, results: [], done: false });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    setState({ loading: false, results: [], done: false });
  }, [query]);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ loading: true, results: [], done: false });
    try {
      const results = await searchOpenFoodFacts(q, ctrl.signal);
      setState({ loading: false, results, done: true });
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      setState({
        loading: false, results: [], done: false,
        error: navigator.onLine ? 'No se pudo consultar Open Food Facts. Inténtalo de nuevo en unos segundos.' : 'Sin conexión. Busca en la base local o crea el alimento.'
      });
    }
  };
  return { ...state, search };
}

/** Bloque de resultados online con su botón */
export function OnlineResults({ query, online, hasLocal, onPick }: {
  query: string; online: ReturnType<typeof useOnlineSearch>; hasLocal: boolean; onPick: (f: Food) => void;
}) {
  if (query.trim().length < 2) return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      {!online.done && (
        <button className="btn secondary block" onClick={online.search} disabled={online.loading}>
          {online.loading ? 'Buscando…' : `🛒 Buscar “${query.trim()}” en productos de supermercado`}
        </button>
      )}
      {online.error && <p className="muted small center" role="alert">{online.error}</p>}
      {online.done && (
        <>
          <h3 className="section-header" style={{ marginLeft: 0 }}>Open Food Facts</h3>
          {online.results.length ? (
            <div className="group">
              {online.results.map((f) => <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />)}
            </div>
          ) : (
            <p className="muted small center">Sin resultados online. Puedes crear el alimento tú mismo.</p>
          )}
        </>
      )}
      {!hasLocal && !online.done && !online.loading && <p className="muted small center mt-s">No está en la base local.</p>}
    </div>
  );
}
