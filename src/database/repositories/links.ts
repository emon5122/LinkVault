/**
 * Data access for links, including their folder/tag relations, flag toggles, search, and the bulk
 * insert used by import. All writes go through the shared connection from `../client`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Folder,
  FolderRow,
  Link,
  LinkListParams,
  LinkRow,
  LinkScope,
  LinkWithRelations,
  NewLinkInput,
  SearchResult,
  Tag,
  TagRow,
  UpdateLinkInput,
} from '@/types';
import { extractHost, normalizeUrl, titleFromUrl } from '@/utils/url';

import { getDatabase } from '../client';
import { rowToFolder, rowToLink, rowToTag } from '../mappers';
import {
  buildLinkCountQuery,
  buildLinkListQuery,
  searchTerms,
  type SqlArg,
} from '../queries';

const b = (value: boolean | undefined): number => (value ? 1 : 0);

async function replaceFolders(db: SQLiteDatabase, linkId: number, folderIds: number[]) {
  await db.runAsync('DELETE FROM folder_links WHERE linkId = ?', linkId);
  for (const folderId of folderIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO folder_links (folderId, linkId) VALUES (?, ?)',
      folderId,
      linkId,
    );
  }
}

async function replaceTags(db: SQLiteDatabase, linkId: number, tagIds: number[]) {
  await db.runAsync('DELETE FROM link_tags WHERE linkId = ?', linkId);
  for (const tagId of tagIds) {
    await db.runAsync('INSERT OR IGNORE INTO link_tags (linkId, tagId) VALUES (?, ?)', linkId, tagId);
  }
}

async function getById(id: number): Promise<Link | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<LinkRow>('SELECT * FROM links WHERE id = ?', id);
  return row ? rowToLink(row) : null;
}

async function foldersForLink(db: SQLiteDatabase, linkId: number): Promise<Folder[]> {
  const rows = await db.getAllAsync<FolderRow>(
    `SELECT f.* FROM folders f
     JOIN folder_links fl ON fl.folderId = f.id
     WHERE fl.linkId = ?
     ORDER BY f.position ASC, f.name COLLATE NOCASE ASC`,
    linkId,
  );
  return rows.map(rowToFolder);
}

async function tagsForLink(db: SQLiteDatabase, linkId: number): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>(
    `SELECT t.* FROM tags t
     JOIN link_tags lt ON lt.tagId = t.id
     WHERE lt.linkId = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    linkId,
  );
  return rows.map(rowToTag);
}

async function getByIdWithRelations(id: number): Promise<LinkWithRelations | null> {
  const db = getDatabase();
  const link = await getById(id);
  if (!link) return null;
  const [folders, tags] = await Promise.all([foldersForLink(db, id), tagsForLink(db, id)]);
  return { ...link, folders, tags };
}

/** Insert a new link and its relations. Metadata/flags default sensibly when omitted. */
async function create(input: NewLinkInput): Promise<Link> {
  const db = getDatabase();
  const now = Date.now();
  const url = input.url.trim();
  const title = input.title?.trim() || titleFromUrl(url);

  let createdId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO links
        (title, url, normalizedUrl, host, description, image, favicon, siteName, notes,
         favorite, archived, readLater, pinned, readAt, lastOpenedAt, visitCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        url,
        normalizeUrl(url),
        extractHost(url),
        input.description ?? null,
        input.image ?? null,
        input.favicon ?? null,
        input.siteName ?? null,
        input.notes ?? null,
        b(input.favorite),
        b(input.archived),
        b(input.readLater),
        b(input.pinned),
        null,
        null,
        0,
        now,
        now,
      ],
    );
    createdId = result.lastInsertRowId;
    if (input.folderIds?.length) await replaceFolders(db, createdId, input.folderIds);
    if (input.tagIds?.length) await replaceTags(db, createdId, input.tagIds);
  });

  const created = await getById(createdId);
  if (!created) throw new Error('Failed to create link');
  return created;
}

/** Update mutable columns and (optionally) replace folder/tag relations. */
async function update(id: number, input: UpdateLinkInput): Promise<Link | null> {
  const db = getDatabase();
  const sets: string[] = [];
  const args: SqlArg[] = [];

  const assign = (column: string, value: SqlArg | null) => {
    sets.push(`${column} = ?`);
    args.push(value as SqlArg);
  };

  if (input.title !== undefined) assign('title', input.title.trim());
  if (input.url !== undefined) {
    const url = input.url.trim();
    assign('url', url);
    assign('normalizedUrl', normalizeUrl(url));
    assign('host', extractHost(url));
  }
  if (input.description !== undefined) assign('description', input.description);
  if (input.image !== undefined) assign('image', input.image);
  if (input.favicon !== undefined) assign('favicon', input.favicon);
  if (input.siteName !== undefined) assign('siteName', input.siteName);
  if (input.notes !== undefined) assign('notes', input.notes);
  if (input.favorite !== undefined) assign('favorite', b(input.favorite));
  if (input.archived !== undefined) assign('archived', b(input.archived));
  if (input.readLater !== undefined) assign('readLater', b(input.readLater));
  if (input.pinned !== undefined) assign('pinned', b(input.pinned));

  await db.withTransactionAsync(async () => {
    if (sets.length > 0) {
      assign('updatedAt', Date.now());
      await db.runAsync(`UPDATE links SET ${sets.join(', ')} WHERE id = ?`, [...args, id]);
    }
    if (input.folderIds !== undefined) await replaceFolders(db, id, input.folderIds);
    if (input.tagIds !== undefined) await replaceTags(db, id, input.tagIds);
  });

  return getById(id);
}

async function list(params: LinkListParams): Promise<Link[]> {
  const db = getDatabase();
  const { sql, args } = buildLinkListQuery(params);
  const rows = await db.getAllAsync<LinkRow>(sql, args);
  return rows.map(rowToLink);
}

async function countByScope(scope: LinkScope, includeArchived = false): Promise<number> {
  const db = getDatabase();
  const { sql, args } = buildLinkCountQuery(scope, includeArchived);
  const row = await db.getFirstAsync<{ count: number }>(sql, args);
  return row?.count ?? 0;
}

/** Which of a link's own text fields contain every search term (for result highlighting). */
function matchedFields(link: Link, terms: string[]): string[] {
  const fields: { name: string; value: string | null }[] = [
    { name: 'title', value: link.title },
    { name: 'url', value: link.url },
    { name: 'description', value: link.description },
    { name: 'notes', value: link.notes },
    { name: 'siteName', value: link.siteName },
    { name: 'host', value: link.host },
  ];
  return fields
    .filter((f) => f.value && terms.some((t) => f.value!.toLowerCase().includes(t)))
    .map((f) => f.name);
}

async function search(query: string, limit = 50): Promise<SearchResult[]> {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  const links = await list({ scope: { type: 'search', query }, sort: 'updatedDesc', limit });
  return links.map((link) => ({ link, matchedFields: matchedFields(link, terms) }));
}

async function setFlag(
  id: number,
  column: 'favorite' | 'readLater' | 'archived' | 'pinned',
  value: boolean,
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE links SET ${column} = ?, updatedAt = ? WHERE id = ?`,
    b(value),
    Date.now(),
    id,
  );
}

/** Toggle a boolean flag, returning the new value. */
async function toggleFlag(
  id: number,
  column: 'favorite' | 'readLater' | 'archived' | 'pinned',
): Promise<boolean> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT ${column} AS value FROM links WHERE id = ?`,
    id,
  );
  const next = row?.value === 1 ? false : true;
  await setFlag(id, column, next);
  return next;
}

/** Mark a Read Later item as read: remove it from the queue and stamp `readAt`. */
async function markRead(id: number, read = true): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE links SET readLater = ?, readAt = ?, updatedAt = ? WHERE id = ?',
    read ? 0 : 1,
    read ? now : null,
    now,
    id,
  );
}

/** Record that the user opened a link: bump visit count + `lastOpenedAt`. */
async function recordOpen(id: number): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE links SET visitCount = visitCount + 1, lastOpenedAt = ?, updatedAt = ? WHERE id = ?',
    now,
    now,
    id,
  );
}

async function remove(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM links WHERE id = ?', id);
}

/** Permanently delete every archived link (used by "empty archive"). */
async function emptyArchive(): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync('DELETE FROM links WHERE archived = 1');
  return result.changes;
}

/** Find an existing link with the same canonical URL (duplicate detection). */
async function findByNormalizedUrl(url: string): Promise<Link | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<LinkRow>(
    'SELECT * FROM links WHERE normalizedUrl = ? ORDER BY id ASC LIMIT 1',
    normalizeUrl(url),
  );
  return row ? rowToLink(row) : null;
}

/** Every link, oldest first — used by export/backup. */
async function getAll(): Promise<Link[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<LinkRow>('SELECT * FROM links ORDER BY createdAt ASC, id ASC');
  return rows.map(rowToLink);
}

/**
 * Bulk insert for import. Skips rows whose canonical URL already exists (or was seen earlier in the
 * same batch). Runs in a single transaction for speed. Returns counts for the import summary.
 */
async function bulkInsert(
  inputs: NewLinkInput[],
): Promise<{ inserted: number; skipped: number; ids: number[] }> {
  const db = getDatabase();
  let inserted = 0;
  let skipped = 0;
  const ids: number[] = [];

  const existingRows = await db.getAllAsync<{ normalizedUrl: string }>(
    'SELECT normalizedUrl FROM links',
  );
  const seen = new Set(existingRows.map((r) => r.normalizedUrl));

  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      const url = input.url.trim();
      const key = normalizeUrl(url);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      const now = Date.now();
      const result = await db.runAsync(
        `INSERT INTO links
          (title, url, normalizedUrl, host, description, image, favicon, siteName, notes,
           favorite, archived, readLater, pinned, readAt, lastOpenedAt, visitCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title?.trim() || titleFromUrl(url),
          url,
          key,
          extractHost(url),
          input.description ?? null,
          input.image ?? null,
          input.favicon ?? null,
          input.siteName ?? null,
          input.notes ?? null,
          b(input.favorite),
          b(input.archived),
          b(input.readLater),
          b(input.pinned),
          null,
          null,
          0,
          now,
          now,
        ],
      );
      const id = result.lastInsertRowId;
      ids.push(id);
      if (input.folderIds?.length) await replaceFolders(db, id, input.folderIds);
      if (input.tagIds?.length) await replaceTags(db, id, input.tagIds);
      inserted += 1;
    }
  });

  return { inserted, skipped, ids };
}

export const linksRepository = {
  create,
  update,
  getById,
  getByIdWithRelations,
  list,
  countByScope,
  search,
  setFlag,
  toggleFlag,
  markRead,
  recordOpen,
  remove,
  emptyArchive,
  findByNormalizedUrl,
  getAll,
  bulkInsert,
};
