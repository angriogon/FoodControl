import { useMemo, useSyncExternalStore } from 'react';
import type { ActivityEntry, AdaptiveCheck, AppState, DayLog, Food, FoodEntry, Menu, Profile, Recipe, Species, UiSettings, WeightEntry } from '../types';
import { loadState, saveState } from '../lib/storage';
import { MAX_ALIASES, defaultState } from './defaults';
import { buildUsage, type UsageMap } from '../lib/usage';
import { computeTargets, emptyDay } from '../lib/nutrition';
import { todayKey } from '../lib/dates';
import type { Slot } from '../lib/pet';

// Store mínimo sin dependencias: un único estado inmutable + suscriptores.
// useSyncExternalStore garantiza que React lo lea de forma consistente.

let state: AppState = defaultState();
let ready = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveState(state), 250);
}

/** Guarda inmediatamente (al pasar la app a segundo plano iOS puede matarla). */
export function flush() {
  clearTimeout(saveTimer);
  return saveState(state);
}

export async function initStore() {
  state = await loadState();
  ready = true;
  emit();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
  window.addEventListener('pagehide', () => void flush());
}

function update(fn: (s: AppState) => AppState) {
  state = fn(state);
  emit();
  scheduleSave();
}

function updateDay(date: string, fn: (d: DayLog) => DayLog) {
  update((s) => ({ ...s, days: { ...s.days, [date]: fn(s.days[date] ?? emptyDay()) } }));
}

export function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const actions = {
  /** Vuelve a poner partes del estado tal como estaban (para “Deshacer”) */
  restore(partial: Partial<AppState>) {
    update((s) => ({ ...s, ...partial }));
  },
  /** Recuerda qué alimento querías decir con unas palabras (registro por texto) */
  learnAliases(pairs: [string, string][]) {
    if (!pairs.length) return;
    update((s) => {
      const next = { ...s.textAliases };
      for (const [k, id] of pairs) {
        delete next[k];
        next[k] = id; // al final = más reciente
      }
      const keys = Object.keys(next);
      // Límite: se olvidan las más antiguas
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ALIASES))) delete next[k];
      return { ...s, textAliases: next };
    });
  },
  countAction(id: string) {
    update((s) => ({ ...s, actionUses: { ...s.actionUses, [id]: (s.actionUses[id] ?? 0) + 1 } }));
  },
  addEntry(date: string, entry: FoodEntry) {
    updateDay(date, (d) => ({ ...d, entries: [...d.entries, entry] }));
  },
  /** Añade varios alimentos de golpe (menús, sugerencias). Devuelve los ids para poder deshacer. */
  addEntries(date: string, entries: FoodEntry[]) {
    updateDay(date, (d) => ({ ...d, entries: [...d.entries, ...entries] }));
    return entries.map((e) => e.id);
  },
  /** Deshacer un borrado: vuelve a poner los alimentos en su posición original */
  restoreEntries(date: string, removed: { entry: FoodEntry; index: number }[]) {
    updateDay(date, (d) => {
      const entries = [...d.entries];
      for (const r of [...removed].sort((a, b) => a.index - b.index)) {
        if (entries.some((e) => e.id === r.entry.id)) continue;
        entries.splice(Math.min(r.index, entries.length), 0, r.entry);
      }
      return { ...d, entries };
    });
  },
  removeEntries(date: string, ids: string[]) {
    const set = new Set(ids);
    updateDay(date, (d) => ({ ...d, entries: d.entries.filter((e) => !set.has(e.id)) }));
  },
  saveRecipe(r: Recipe) {
    update((s) => ({ ...s, recipes: [r, ...s.recipes.filter((x) => x.id !== r.id)] }));
  },
  deleteRecipe(id: string) {
    update((s) => ({ ...s, recipes: s.recipes.filter((x) => x.id !== id) }));
  },
  saveMenu(m: Menu) {
    update((s) => ({ ...s, menus: [m, ...s.menus.filter((x) => x.id !== m.id)] }));
  },
  deleteMenu(id: string) {
    update((s) => ({ ...s, menus: s.menus.filter((x) => x.id !== id) }));
  },
  markMenuUsed(id: string) {
    update((s) => ({ ...s, menus: s.menus.map((m) => (m.id === id ? { ...m, uses: m.uses + 1 } : m)) }));
  },
  /** Guarda una revisión del objetivo adaptativo (y la aplica si procede) */
  recordAdaptive(check: AdaptiveCheck) {
    update((s) => ({
      ...s,
      adaptive: {
        ...s.adaptive,
        tdee: check.applied ? check.tdee : s.adaptive.tdee,
        history: [...s.adaptive.history, check].slice(-260)
      }
    }));
  },
  /** Deshace el último ajuste: vuelve al gasto anterior */
  undoAdaptive(date: string) {
    update((s) => {
      const check = s.adaptive.history.find((h) => h.date === date && h.applied);
      if (!check || check.undone) return s;
      return {
        ...s,
        adaptive: {
          ...s.adaptive,
          tdee: check.prevTdee,
          history: s.adaptive.history.map((h) => (h === check ? { ...h, undone: true } : h))
        }
      };
    });
  },
  setAdaptiveEnabled(enabled: boolean) {
    update((s) => ({ ...s, adaptive: { ...s.adaptive, enabled } }));
  },
  /** Vuelve a empezar la calibración desde la fórmula */
  resetAdaptive() {
    update((s) => ({ ...s, adaptive: { ...s.adaptive, tdee: undefined } }));
  },
  setDayIncomplete(date: string, incomplete: boolean) {
    updateDay(date, (d) => ({ ...d, incomplete: incomplete || undefined }));
  },
  updateEntry(date: string, entry: FoodEntry) {
    updateDay(date, (d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? entry : e)) }));
  },
  removeEntry(date: string, id: string) {
    updateDay(date, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  },
  /** Copia una comida de otro día. Devuelve los ids creados (para deshacer) */
  copyMeal(from: string, to: string, meal: FoodEntry['meal']): string[] {
    const src = state.days[from]?.entries.filter((e) => e.meal === meal) ?? [];
    if (!src.length) return [];
    const copies = src.map((e) => ({ ...e, id: uid(), createdAt: new Date().toISOString() }));
    updateDay(to, (d) => ({ ...d, entries: [...d.entries, ...copies] }));
    return copies.map((e) => e.id);
  },

  addActivity(date: string, a: ActivityEntry) {
    updateDay(date, (d) => ({ ...d, activities: [...d.activities, a] }));
  },
  removeActivity(date: string, id: string) {
    updateDay(date, (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  },
  setWater(date: string, ml: number) {
    updateDay(date, (d) => ({ ...d, waterMl: Math.max(0, Math.round(ml)) }));
  },
  setNote(date: string, note: string) {
    updateDay(date, (d) => ({ ...d, note }));
  },
  addWeight(w: WeightEntry) {
    update((s) => ({
      ...s,
      weights: [...s.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date))
    }));
  },
  removeWeight(date: string) {
    update((s) => ({ ...s, weights: s.weights.filter((w) => w.date !== date) }));
  },
  updateProfile(p: Partial<Profile>) {
    update((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  },
  saveCustomFood(f: Food) {
    update((s) => ({ ...s, customFoods: [f, ...s.customFoods.filter((x) => x.id !== f.id)] }));
  },
  removeCustomFood(id: string) {
    update((s) => ({
      ...s,
      customFoods: s.customFoods.filter((x) => x.id !== id),
      recentFoods: s.recentFoods.filter((x) => x.id !== id)
    }));
  },
  pushRecent(f: Food) {
    update((s) => ({ ...s, recentFoods: [f, ...s.recentFoods.filter((x) => x.id !== f.id)].slice(0, 40) }));
  },
  setSpecies(species: Species, name?: string) {
    update((s) => ({ ...s, pet: { ...s.pet, species, name: name ?? s.pet.name } }));
  },
  updateUi(ui: Partial<UiSettings>) {
    update((s) => ({ ...s, ui: { ...s.ui, ...ui } }));
  },
  resetOutfit() {
    update((s) => ({ ...s, pet: { ...s.pet, equipped: { ...s.pet.equipped, hat: 'none', face: 'none', neck: 'none', body: 'none', hand: 'none', pal: 'none' } } }));
  },
  renamePet(name: string) {
    update((s) => ({ ...s, pet: { ...s.pet, name } }));
  },
  equip(slot: Slot, value: string) {
    update((s) => ({ ...s, pet: { ...s.pet, equipped: { ...s.pet.equipped, [slot]: value } } }));
  },
  purchase(itemId: string, price: number) {
    update((s) => ({
      ...s,
      gemsSpent: s.gemsSpent + price,
      pet: { ...s.pet, purchased: [...new Set([...s.pet.purchased, itemId])] }
    }));
  },
  unlockAchievements(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    update((s) => ({ ...s, achievements: { ...s.achievements, ...Object.fromEntries(ids.map((id) => [id, now])) } }));
  },
  markBackup() {
    update((s) => ({ ...s, lastBackupAt: new Date().toISOString() }));
  },
  replaceState(next: AppState) {
    update(() => next);
    void flush();
  },
  reset() {
    update(() => defaultState());
    void flush();
  }
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Lectura directa del estado (fuera de React, p. ej. en la pantalla de error) */
export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

// Uso de cada alimento: se recalcula solo cuando cambia el diario
let usageCache: { days: AppState['days']; map: UsageMap } | null = null;
export function getUsage(s: AppState = state): UsageMap {
  if (usageCache?.days !== s.days) usageCache = { days: s.days, map: buildUsage(s.days) };
  return usageCache.map;
}
export function useUsage(): UsageMap {
  const s = useAppState();
  return useMemo(() => getUsage(s), [s.days]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}

export function currentWeight(s: AppState): number {
  return s.weights.length ? s.weights[s.weights.length - 1].kg : s.profile.startWeightKg;
}

export function useTargets() {
  const s = useAppState();
  const w = currentWeight(s);
  const adaptiveTdee = s.adaptive.enabled ? s.adaptive.tdee : undefined;
  return useMemo(() => computeTargets(s.profile, w, adaptiveTdee), [s.profile, w, adaptiveTdee]);
}

export function useDay(date: string): DayLog {
  const s = useAppState();
  return s.days[date] ?? EMPTY;
}
const EMPTY = emptyDay();

// ───── Estado de UI (no persistente) ─────
let selectedDate = todayKey();
const uiListeners = new Set<() => void>();
export function useSelectedDate(): [string, (d: string) => void] {
  const d = useSyncExternalStore(
    (l) => {
      uiListeners.add(l);
      return () => uiListeners.delete(l);
    },
    () => selectedDate
  );
  return [d, setSelectedDate];
}
export function setSelectedDate(d: string) {
  selectedDate = d;
  uiListeners.forEach((l) => l());
}
