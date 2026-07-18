/**
 * MMKV-backed key/value storage for preferences and lightweight app state.
 *
 * MMKV is a synchronous native module (does not run in Expo Go — a development build is required).
 * This module exposes a typed JSON helper plus a Zustand `persist` adapter so stores can be
 * durable without touching the database.
 */
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// MMKV v4 is Nitro-based: instances are created via `createMMKV`, not `new MMKV`.
export const storage = createMMKV({ id: 'linkvault' });

/** Read + JSON-parse a value, returning `fallback` when absent or malformed. */
export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function getBoolean(key: string, fallback = false): boolean {
  return storage.getBoolean(key) ?? fallback;
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}

export function remove(key: string): void {
  storage.remove(key);
}

/** Zustand persist middleware adapter backed by MMKV. */
export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};
