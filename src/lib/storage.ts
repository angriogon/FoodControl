import { createStore, get, set } from 'idb-keyval';
import type { AppState } from '../types';
import { defaultState, migrate } from '../store/defaults';

// ───────────── Persistencia local ─────────────
// IndexedDB (vía idb-keyval) es el almacenamiento más robusto disponible en
// Safari/iOS para una web app: más capacidad que localStorage y no bloquea la UI.
// localStorage se mantiene como espejo de emergencia por si IndexedDB fallase.

const KEY = 'foodcontrol:state:v1';
const LS_KEY = 'foodcontrol:mirror:v1';

// Base de datos PROPIA. Todas las webs de angriogon.github.io comparten
// origen (y por tanto almacenamiento); con la base genérica de idb-keyval,
// otra app del mismo dominio podría sobrescribir o vaciar estos datos.
// Se crea de forma perezosa para no tocar IndexedDB si no está disponible.
let store: ReturnType<typeof createStore> | undefined;
const db = () => (store ??= createStore('foodcontrol', 'state'));

export async function loadState(): Promise<AppState> {
  try {
    const data = await get<unknown>(KEY, db());
    if (data) return migrate(data);
    // Migración desde la base genérica usada hasta noviembre de 2026.
    // No se borra la copia antigua: así nunca se pierde nada si algo falla.
    const legacy = await get<unknown>(KEY);
    if (legacy) {
      const state = migrate(legacy);
      await set(KEY, state, db());
      return state;
    }
  } catch (err) {
    console.warn('IndexedDB no disponible, usando localStorage', err);
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* sin datos */
  }
  return defaultState();
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await set(KEY, state, db());
  } catch (err) {
    console.error('Error guardando en IndexedDB', err);
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* cuota excedida: IndexedDB es la fuente principal */
  }
}

/**
 * Pide al navegador que NO borre nuestros datos si falta espacio.
 * En iOS las web apps añadidas a la pantalla de inicio ya están exentas del
 * borrado automático de 7 días de Safari, pero esto añade una capa más.
 */
export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function storageInfo(): Promise<{ persisted: boolean | null; usageKb: number | null }> {
  let persisted: boolean | null = null;
  let usageKb: number | null = null;
  try {
    if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      usageKb = e.usage != null ? Math.round(e.usage / 1024) : null;
    }
  } catch {
    /* no soportado */
  }
  return { persisted, usageKb };
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ───────────── Copias de seguridad ─────────────

export function backupFileName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `foodcontrol-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/**
 * Exporta un JSON. En iPhone abre la hoja de compartir nativa para guardarlo
 * en Archivos → iCloud Drive (así sobrevive aunque se borre la app).
 * Devuelve 'shared' | 'downloaded' | 'cancelled'.
 */
export async function exportBackup(state: AppState): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify({ app: 'FoodControl', exportedAt: new Date().toISOString(), state }, null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Copia de FoodControl' });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

const MAX_BACKUP_BYTES = 20 * 1024 * 1024; // una copia real ocupa KB; 20 MB es un límite holgado

export async function parseBackup(file: File): Promise<AppState> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo es demasiado grande para ser una copia de FoodControl.');
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const obj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as { state?: unknown; version?: unknown; profile?: unknown; days?: unknown };
  const candidate = (obj.state ?? (obj.version === 1 ? obj : null)) as { profile?: unknown; days?: unknown } | null;
  if (!candidate || typeof candidate !== 'object' || typeof candidate.profile !== 'object' || typeof candidate.days !== 'object') {
    throw new Error('El archivo no parece una copia de FoodControl.');
  }
  // migrate() valida y sanea cada campo: una copia dañada nunca rompe la app
  return migrate(candidate);
}
