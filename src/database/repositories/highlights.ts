/**
 * Data access for reader highlights.
 *
 * A highlight anchors to `(linkId, blockIndex, startOffset, endOffset)` in the link's stored
 * article content. Deletes cascade from `links`, so removing a link takes its highlights with it.
 */
import type { Highlight, HighlightRow, HighlightWithLink, LinkRow, NewHighlightInput } from '@/types';

import { getDatabase } from '../client';
import { rowToHighlight, rowToLink } from '../mappers';

async function listForLink(linkId: number): Promise<Highlight[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<HighlightRow>(
    'SELECT * FROM highlights WHERE linkId = ? ORDER BY blockIndex ASC, startOffset ASC',
    linkId,
  );
  return rows.map(rowToHighlight);
}

/** Every highlight in the library, newest first, joined with its link for the browse screen. */
async function listAll(limit = 200): Promise<HighlightWithLink[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<HighlightRow & { link: string }>(
    `SELECT h.* FROM highlights h ORDER BY h.createdAt DESC LIMIT ?`,
    limit,
  );
  if (rows.length === 0) return [];

  const linkIds = [...new Set(rows.map((r) => r.linkId))];
  const placeholders = linkIds.map(() => '?').join(', ');
  const linkRows = await db.getAllAsync<LinkRow>(
    `SELECT * FROM links WHERE id IN (${placeholders})`,
    linkIds,
  );
  const linkById = new Map(linkRows.map((row) => [row.id, rowToLink(row)]));

  return rows
    .map((row) => {
      const link = linkById.get(row.linkId);
      return link ? { ...rowToHighlight(row), link } : null;
    })
    .filter((h): h is HighlightWithLink => h !== null);
}

async function create(input: NewHighlightInput): Promise<Highlight> {
  const db = getDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO highlights (linkId, text, note, color, blockIndex, startOffset, endOffset, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.linkId,
    input.text,
    input.note ?? null,
    input.color ?? 'yellow',
    input.blockIndex,
    input.startOffset,
    input.endOffset,
    now,
  );
  const row = await db.getFirstAsync<HighlightRow>(
    'SELECT * FROM highlights WHERE id = ?',
    result.lastInsertRowId,
  );
  if (!row) throw new Error('Failed to create highlight');
  return rowToHighlight(row);
}

async function remove(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM highlights WHERE id = ?', id);
}

/** Remove the highlight covering an exact span, if one exists. Returns true when one was removed. */
async function removeAt(
  linkId: number,
  blockIndex: number,
  startOffset: number,
  endOffset: number,
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.runAsync(
    'DELETE FROM highlights WHERE linkId = ? AND blockIndex = ? AND startOffset = ? AND endOffset = ?',
    linkId,
    blockIndex,
    startOffset,
    endOffset,
  );
  return result.changes > 0;
}

async function setNote(id: number, note: string | null): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE highlights SET note = ? WHERE id = ?', note, id);
}

async function countForLink(linkId: number): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM highlights WHERE linkId = ?',
    linkId,
  );
  return row?.count ?? 0;
}

/** Every highlight with its primary key intact — used by backup. */
async function getAll(): Promise<Highlight[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<HighlightRow>('SELECT * FROM highlights ORDER BY id ASC');
  return rows.map(rowToHighlight);
}

export const highlightsRepository = {
  listForLink,
  listAll,
  create,
  remove,
  removeAt,
  setNote,
  countForLink,
  getAll,
};
