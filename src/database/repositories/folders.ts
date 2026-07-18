/** Data access for folders, including link counts and drag-to-reorder positioning. */
import type {
  Folder,
  FolderRow,
  FolderWithCount,
  NewFolderInput,
  UpdateFolderInput,
} from '@/types';
import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '@/constants/config';

import { getDatabase } from '../client';
import { rowToFolder } from '../mappers';

async function getById(id: number): Promise<Folder | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<FolderRow>('SELECT * FROM folders WHERE id = ?', id);
  return row ? rowToFolder(row) : null;
}

async function list(): Promise<Folder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<FolderRow>(
    'SELECT * FROM folders ORDER BY position ASC, name COLLATE NOCASE ASC',
  );
  return rows.map(rowToFolder);
}

/** Folders with a live count of the links they contain. */
async function listWithCounts(): Promise<FolderWithCount[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<FolderRow & { linkCount: number }>(
    `SELECT f.*, COUNT(fl.linkId) AS linkCount
     FROM folders f
     LEFT JOIN folder_links fl ON fl.folderId = f.id
     LEFT JOIN links l ON l.id = fl.linkId AND l.archived = 0
     GROUP BY f.id
     ORDER BY f.position ASC, f.name COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ ...rowToFolder(row), linkCount: row.linkCount }));
}

async function create(input: NewFolderInput): Promise<Folder> {
  const db = getDatabase();
  const now = Date.now();
  const positionRow = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM folders',
  );
  const result = await db.runAsync(
    'INSERT INTO folders (name, icon, color, position, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    input.name.trim(),
    input.icon ?? DEFAULT_FOLDER_ICON,
    input.color ?? DEFAULT_FOLDER_COLOR,
    positionRow?.next ?? 0,
    now,
    now,
  );
  const created = await getById(result.lastInsertRowId);
  if (!created) throw new Error('Failed to create folder');
  return created;
}

async function update(id: number, input: UpdateFolderInput): Promise<Folder | null> {
  const db = getDatabase();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (input.name !== undefined) {
    sets.push('name = ?');
    args.push(input.name.trim());
  }
  if (input.icon !== undefined) {
    sets.push('icon = ?');
    args.push(input.icon);
  }
  if (input.color !== undefined) {
    sets.push('color = ?');
    args.push(input.color);
  }
  if (input.position !== undefined) {
    sets.push('position = ?');
    args.push(input.position);
  }
  if (sets.length > 0) {
    sets.push('updatedAt = ?');
    args.push(Date.now());
    await db.runAsync(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`, [...args, id]);
  }
  return getById(id);
}

async function remove(id: number): Promise<void> {
  const db = getDatabase();
  // folder_links rows cascade on delete; the links themselves are preserved.
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

/** Persist a new ordering. `orderedIds` is the folder id list in display order. */
async function reorder(orderedIds: number[]): Promise<void> {
  const db = getDatabase();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await db.runAsync(
        'UPDATE folders SET position = ?, updatedAt = ? WHERE id = ?',
        index,
        now,
        orderedIds[index],
      );
    }
  });
}

async function getByName(name: string): Promise<Folder | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<FolderRow>(
    'SELECT * FROM folders WHERE name = ? COLLATE NOCASE ORDER BY id ASC LIMIT 1',
    name.trim(),
  );
  return row ? rowToFolder(row) : null;
}

/** Reuse an existing folder with the same (case-insensitive) name, or create one. Used by import. */
async function getOrCreateByName(name: string): Promise<Folder> {
  const existing = await getByName(name);
  if (existing) return existing;
  return create({ name });
}

async function getAll(): Promise<Folder[]> {
  return list();
}

export const foldersRepository = {
  getById,
  getByName,
  getOrCreateByName,
  list,
  listWithCounts,
  create,
  update,
  remove,
  reorder,
  getAll,
};
