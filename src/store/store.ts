import { useMemo, useSyncExternalStore } from 'react';
import type { ActivityEntry, AppState, DayLog, Food, FoodEntry, Profile, Species, UiSettings, WeightEntry } from '../types';
import { loadState, saveState } from '../lib/storage';
import { defaultState } from './defaults';
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
  addEntry(date: string, entry: FoodEntry) {
    updateDay(date, (d) => ({ ...d, entries: [...d.entries, entry] }));
  },
  updateEntry(date: string, entry: FoodEntry) {
    updateDay(date, (d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? entry : e)) }));
  },
  removeEntry(date: string, id: string) {
    updateDay(date, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  },
  copyMeal(from: string, to: string, meal: FoodEntry['meal']) {
    const src = state.days[from]?.entries.filter((e) => e.meal === meal) ?? [];
    if (!src.length) return 0;
    updateDay(to, (d) => ({
      ...d,
      entries: [...d.entries, ...src.map((e) => ({ ...e, id: uid(), createdAt: new Date().toISOString() }))]
    }));
    return src.length;
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

export function useStoreReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}

export function currentWeight(s: AppState): number {
  return s.weights.length ? s.weights[s.weights.length - 1].kg : s.profile.startWeightKg;
}

export function useTargets() {
  const s = useAppState();
  const w = currentWeight(s);
  return useMemo(() => computeTargets(s.profile, w), [s.profile, w]);
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
