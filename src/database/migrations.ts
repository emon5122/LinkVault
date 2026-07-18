/**
 * Versioned migrations applied through `PRAGMA user_version`.
 *
 * Each migration bumps the schema version by one. To evolve the schema, append a new entry to
 * `MIGRATIONS` — never edit an existing one — so that existing installs upgrade incrementally.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_FOLDER_LINKS_TABLE,
  CREATE_FOLDERS_TABLE,
  CREATE_INDEXES,
  CREATE_LINK_TAGS_TABLE,
  CREATE_LINKS_TABLE,
  CREATE_TAGS_TABLE,
} from './schema';

interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(CREATE_LINKS_TABLE);
      await db.execAsync(CREATE_FOLDERS_TABLE);
      await db.execAsync(CREATE_TAGS_TABLE);
      await db.execAsync(CREATE_LINK_TAGS_TABLE);
      await db.execAsync(CREATE_FOLDER_LINKS_TABLE);
      for (const statement of CREATE_INDEXES) {
        await db.execAsync(statement);
      }
    },
  },
];

/** The version the app expects after all migrations have run. */
export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Bring the database up to the latest schema version. Idempotent: already-applied migrations are
 * skipped based on the stored `user_version`. Each migration runs inside its own transaction.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      await migration.up(db);
    });
    // PRAGMA cannot be parameterized; the version is a trusted integer literal.
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    currentVersion = migration.version;
  }
}
