/**
 * SQLite-backed key/value storage for preferences and lightweight app state.
 *
 * Backed by `expo-sqlite/kv-store`, which ships with Expo Go and exposes synchronous accessors,
 * so this module keeps the synchronous surface the rest of the app already relies on. (It replaced
 * MMKV, whose Nitro native module cannot load in Expo Go.)
 * This module exposes a typed JSON helper plus a Zustand `persist` adapter so stores can be
 * durable without touching the database.
 */
import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

export const storage = Storage;

/** Read + JSON-parse a value, returning `fallback` when absent or malformed. */
export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.getItemSync(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  storage.setItemSync(key, JSON.stringify(value));
}

export function getString(key: string): string | undefined {
  return storage.getItemSync(key) ?? undefined;
}

export function setString(key: string, value: string): void {
  storage.setItemSync(key, value);
}

// The kv-store persists strings only, so booleans round-trip through a literal encoding.
export function getBoolean(key: string, fallback = false): boolean {
  const raw = storage.getItemSync(key);
  if (raw == null) return fallback;
  return raw === 'true';
}

export function setBoolean(key: string, value: boolean): void {
  storage.setItemSync(key, value ? 'true' : 'false');
}

export function remove(key: string): void {
  storage.removeItemSync(key);
}

/** Zustand persist middleware adapter backed by the SQLite kv-store. */
export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getItemSync(name),
  setItem: (name, value) => storage.setItemSync(name, value),
  removeItem: (name) => storage.removeItemSync(name),
};
