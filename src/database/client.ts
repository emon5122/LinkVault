/**
 * Single shared SQLite connection.
 *
 * A module-level singleton (rather than only `SQLiteProvider`) lets non-React code — the backup,
 * import/export, and notification services — reach the same database. `initDatabase` is awaited
 * once during app startup (see `providers/app-providers.tsx`) before any query runs.
 */
import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '@/constants/config';

import { runMigrations } from './migrations';

let connection: SQLite.SQLiteDatabase | null = null;

/** Get (opening on first use) the shared database connection. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!connection) {
    connection = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return connection;
}

let initPromise: Promise<void> | null = null;

/** Open the connection, enable WAL + foreign keys, and run migrations. Safe to call repeatedly. */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getDatabase();
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
    })();
  }
  return initPromise;
}

/**
 * Drop all user data (used by "restore backup" before importing, and by tests).
 * Keeps the schema/version intact.
 */
export async function resetDatabaseContents(): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM link_tags;
      DELETE FROM folder_links;
      DELETE FROM links;
      DELETE FROM folders;
      DELETE FROM tags;
      DELETE FROM sqlite_sequence;
    `);
  });
}
