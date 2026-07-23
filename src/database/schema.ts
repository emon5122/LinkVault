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

/**
 * Columns added in schema v2 for the article archive and link-health features.
 *
 * `content` holds the extracted article body in the line-based block format produced by
 * `services/readability` — plain text per line, so the FTS tokenizer indexes real words rather than
 * markup. `status`/`checkedAt` back the health checker; `archiveUrl` caches a Wayback snapshot so a
 * dead link still resolves to something readable.
 */
export const V2_LINK_COLUMNS = [
  "ALTER TABLE links ADD COLUMN content TEXT;",
  "ALTER TABLE links ADD COLUMN excerpt TEXT;",
  "ALTER TABLE links ADD COLUMN byline TEXT;",
  "ALTER TABLE links ADD COLUMN wordCount INTEGER;",
  "ALTER TABLE links ADD COLUMN extractedAt INTEGER;",
  "ALTER TABLE links ADD COLUMN status TEXT;",
  "ALTER TABLE links ADD COLUMN statusCode INTEGER;",
  "ALTER TABLE links ADD COLUMN checkedAt INTEGER;",
  "ALTER TABLE links ADD COLUMN archiveUrl TEXT;",
  "ALTER TABLE links ADD COLUMN archivedAt INTEGER;",
];

/**
 * Sentence-level highlights captured in the offline reader.
 *
 * A highlight is anchored by `(blockIndex, startOffset, endOffset)` into the stored `content`, which
 * is stable because extraction is deterministic — re-extracting the same HTML yields the same
 * blocks. `text` is denormalized so a highlight stays readable even if re-extraction shifts things.
 */
export const CREATE_HIGHLIGHTS_TABLE = `
CREATE TABLE IF NOT EXISTS highlights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  linkId      INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL,
  note        TEXT,
  color       TEXT    NOT NULL DEFAULT 'yellow',
  blockIndex  INTEGER NOT NULL DEFAULT 0,
  startOffset INTEGER NOT NULL DEFAULT 0,
  endOffset   INTEGER NOT NULL DEFAULT 0,
  createdAt   INTEGER NOT NULL
);`;

/** FTS5 columns, in the order the virtual table and its sync triggers declare them. */
const FTS_COLUMNS = ['title', 'url', 'description', 'notes', 'siteName', 'host', 'content'] as const;

const ftsColumnList = FTS_COLUMNS.join(', ');
const ftsValues = (prefix: 'new' | 'old') => FTS_COLUMNS.map((c) => `${prefix}.${c}`).join(', ');

/**
 * Full-text index over the links table, including extracted article bodies.
 *
 * Declared as an external-content table (`content='links'`) so the text is not duplicated on disk —
 * FTS5 stores only the inverted index and reads column values back from `links` by rowid. That makes
 * the sync triggers below mandatory: without them the index silently drifts from the table.
 */
export const CREATE_LINKS_FTS = `
CREATE VIRTUAL TABLE IF NOT EXISTS links_fts USING fts5(
  ${ftsColumnList},
  content='links',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);`;

export const CREATE_LINKS_FTS_TRIGGERS = [
  `CREATE TRIGGER IF NOT EXISTS links_fts_ai AFTER INSERT ON links BEGIN
     INSERT INTO links_fts(rowid, ${ftsColumnList}) VALUES (new.id, ${ftsValues('new')});
   END;`,
  `CREATE TRIGGER IF NOT EXISTS links_fts_ad AFTER DELETE ON links BEGIN
     INSERT INTO links_fts(links_fts, rowid, ${ftsColumnList})
     VALUES('delete', old.id, ${ftsValues('old')});
   END;`,
  // Scoped with `UPDATE OF` so bookkeeping writes (visitCount, lastOpenedAt, flag toggles) don't
  // pay for a needless index delete+insert on every tap.
  `CREATE TRIGGER IF NOT EXISTS links_fts_au
   AFTER UPDATE OF ${ftsColumnList} ON links BEGIN
     INSERT INTO links_fts(links_fts, rowid, ${ftsColumnList})
     VALUES('delete', old.id, ${ftsValues('old')});
     INSERT INTO links_fts(rowid, ${ftsColumnList}) VALUES (new.id, ${ftsValues('new')});
   END;`,
];

/** Backfill the index for rows that existed before the FTS table did. */
export const REBUILD_LINKS_FTS = `INSERT INTO links_fts(links_fts) VALUES('rebuild');`;

export const CREATE_V2_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_links_status      ON links(status);',
  'CREATE INDEX IF NOT EXISTS idx_links_checkedAt   ON links(checkedAt);',
  'CREATE INDEX IF NOT EXISTS idx_links_extractedAt ON links(extractedAt);',
  'CREATE INDEX IF NOT EXISTS idx_highlights_linkId ON highlights(linkId);',
];

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
