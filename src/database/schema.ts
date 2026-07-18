/**
 * SQLite schema definition for LinkVault.
 *
 * Booleans are stored as INTEGER 0/1. Timestamps are epoch milliseconds (INTEGER). Foreign keys
 * cascade on delete so removing a link/folder/tag cleans up its join rows automatically.
 * Migrations in `migrations.ts` apply these statements and are versioned via `PRAGMA user_version`.
 */

export const CREATE_LINKS_TABLE = `
CREATE TABLE IF NOT EXISTS links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL DEFAULT '',
  url           TEXT    NOT NULL,
  normalizedUrl TEXT    NOT NULL,
  host          TEXT,
  description   TEXT,
  image         TEXT,
  favicon       TEXT,
  siteName      TEXT,
  notes         TEXT,
  favorite      INTEGER NOT NULL DEFAULT 0,
  archived      INTEGER NOT NULL DEFAULT 0,
  readLater     INTEGER NOT NULL DEFAULT 0,
  pinned        INTEGER NOT NULL DEFAULT 0,
  readAt        INTEGER,
  lastOpenedAt  INTEGER,
  visitCount    INTEGER NOT NULL DEFAULT 0,
  createdAt     INTEGER NOT NULL,
  updatedAt     INTEGER NOT NULL
);`;

export const CREATE_FOLDERS_TABLE = `
CREATE TABLE IF NOT EXISTS folders (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  icon      TEXT    NOT NULL DEFAULT 'folder',
  color     TEXT    NOT NULL DEFAULT '#2563eb',
  position  INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);`;

export const CREATE_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS tags (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL
);`;

export const CREATE_LINK_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS link_tags (
  linkId INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  tagId  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (linkId, tagId)
);`;

export const CREATE_FOLDER_LINKS_TABLE = `
CREATE TABLE IF NOT EXISTS folder_links (
  folderId INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  linkId   INTEGER NOT NULL REFERENCES links(id)   ON DELETE CASCADE,
  PRIMARY KEY (folderId, linkId)
);`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_links_createdAt    ON links(createdAt DESC);',
  'CREATE INDEX IF NOT EXISTS idx_links_updatedAt    ON links(updatedAt DESC);',
  'CREATE INDEX IF NOT EXISTS idx_links_normalizedUrl ON links(normalizedUrl);',
  'CREATE INDEX IF NOT EXISTS idx_links_favorite     ON links(favorite);',
  'CREATE INDEX IF NOT EXISTS idx_links_readLater    ON links(readLater);',
  'CREATE INDEX IF NOT EXISTS idx_links_archived     ON links(archived);',
  'CREATE INDEX IF NOT EXISTS idx_links_pinned       ON links(pinned);',
  'CREATE INDEX IF NOT EXISTS idx_links_lastOpenedAt ON links(lastOpenedAt DESC);',
  'CREATE INDEX IF NOT EXISTS idx_links_host         ON links(host);',
  'CREATE INDEX IF NOT EXISTS idx_link_tags_tagId    ON link_tags(tagId);',
  'CREATE INDEX IF NOT EXISTS idx_folder_links_folderId ON folder_links(folderId);',
  'CREATE INDEX IF NOT EXISTS idx_folder_links_linkId   ON folder_links(linkId);',
  'CREATE INDEX IF NOT EXISTS idx_folders_position   ON folders(position);',
];

/** All column names on `links`, used to build parameterized INSERT/UPDATE statements. */
export const LINK_COLUMNS = [
  'title',
  'url',
  'normalizedUrl',
  'host',
  'description',
  'image',
  'favicon',
  'siteName',
  'notes',
  'favorite',
  'archived',
  'readLater',
  'pinned',
  'readAt',
  'lastOpenedAt',
  'visitCount',
  'createdAt',
  'updatedAt',
] as const;
