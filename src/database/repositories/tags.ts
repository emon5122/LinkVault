/** Data access for tags. Tag names are unique and normalized (lower-cased, single-spaced). */
import type { Tag, TagRow, TagWithCount } from '@/types';
import { tagNameSchema } from '@/utils/validation';

import { getDatabase } from '../client';
import { rowToTag } from '../mappers';

/** Normalize a raw tag name; throws (via Zod) if empty/too long. */
function normalizeName(name: string): string {
  return tagNameSchema.parse(name);
}

async function getById(id: number): Promise<Tag | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<TagRow>('SELECT * FROM tags WHERE id = ?', id);
  return row ? rowToTag(row) : null;
}

async function getByName(name: string): Promise<Tag | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<TagRow>('SELECT * FROM tags WHERE name = ?', normalizeName(name));
  return row ? rowToTag(row) : null;
}

async function list(): Promise<Tag[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC');
  return rows.map(rowToTag);
}

/** Tags with a count of the non-archived links carrying them, most-used first. */
async function listWithCounts(): Promise<TagWithCount[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TagRow & { linkCount: number }>(
    // COUNT(l.id) — not COUNT(lt.linkId) — so archived links don't inflate the count or skew the
    // most-used ordering.
    `SELECT t.*, COUNT(l.id) AS linkCount
     FROM tags t
     LEFT JOIN link_tags lt ON lt.tagId = t.id
     LEFT JOIN links l ON l.id = lt.linkId AND l.archived = 0
     GROUP BY t.id
     ORDER BY linkCount DESC, t.name COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ ...rowToTag(row), linkCount: row.linkCount }));
}

/** Get an existing tag by name or create it. Idempotent under the unique-name constraint. */
async function getOrCreate(name: string): Promise<Tag> {
  const normalized = normalizeName(name);
  const existing = await getByName(normalized);
  if (existing) return existing;

  const db = getDatabase();
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)',
    normalized,
    Date.now(),
  );
  if (result.changes === 0) {
    // Lost a race with a concurrent insert — fetch the winner.
    const winner = await getByName(normalized);
    if (winner) return winner;
  }
  const created = await getById(result.lastInsertRowId);
  if (!created) throw new Error('Failed to create tag');
  return created;
}

/** Resolve many names to tag ids, creating any that don't exist (used by import). */
async function getOrCreateMany(names: string[]): Promise<Tag[]> {
  const result: Tag[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    try {
      result.push(await getOrCreate(trimmed));
    } catch {
      // Skip invalid tag names silently during bulk import.
    }
  }
  return result;
}

async function rename(id: number, name: string): Promise<Tag | null> {
  const db = getDatabase();
  await db.runAsync('UPDATE tags SET name = ? WHERE id = ?', normalizeName(name), id);
  return getById(id);
}

async function remove(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM tags WHERE id = ?', id);
}

async function getAll(): Promise<Tag[]> {
  return list();
}

export const tagsRepository = {
  getById,
  getByName,
  list,
  listWithCounts,
  getOrCreate,
  getOrCreateMany,
  rename,
  remove,
  getAll,
};
