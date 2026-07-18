/** Bulk access to the join tables, used by export (names) and backup (raw ids). */
import { getDatabase } from '../client';

export interface LinkTagRow {
  linkId: number;
  tagId: number;
}
export interface FolderLinkRow {
  folderId: number;
  linkId: number;
}

async function getAllLinkTags(): Promise<LinkTagRow[]> {
  const db = getDatabase();
  return db.getAllAsync<LinkTagRow>('SELECT linkId, tagId FROM link_tags');
}

async function getAllFolderLinks(): Promise<FolderLinkRow[]> {
  const db = getDatabase();
  return db.getAllAsync<FolderLinkRow>('SELECT folderId, linkId FROM folder_links');
}

/** Map of linkId -> sorted tag names, for human-readable exports. */
async function tagNamesByLink(): Promise<Map<number, string[]>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ linkId: number; name: string }>(
    `SELECT lt.linkId AS linkId, t.name AS name
     FROM link_tags lt JOIN tags t ON t.id = lt.tagId
     ORDER BY t.name COLLATE NOCASE ASC`,
  );
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const list = map.get(row.linkId) ?? [];
    list.push(row.name);
    map.set(row.linkId, list);
  }
  return map;
}

/** Map of linkId -> folder names, for human-readable exports. */
async function folderNamesByLink(): Promise<Map<number, string[]>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ linkId: number; name: string }>(
    `SELECT fl.linkId AS linkId, f.name AS name
     FROM folder_links fl JOIN folders f ON f.id = fl.folderId
     ORDER BY f.name COLLATE NOCASE ASC`,
  );
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const list = map.get(row.linkId) ?? [];
    list.push(row.name);
    map.set(row.linkId, list);
  }
  return map;
}

export const relationsRepository = {
  getAllLinkTags,
  getAllFolderLinks,
  tagNamesByLink,
  folderNamesByLink,
};
