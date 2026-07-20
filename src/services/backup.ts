/**
 * Full local backup + restore.
 *
 * A backup is a JSON snapshot of every table (including join rows) that preserves primary keys, so
 * a restore reproduces the library exactly. Restore is destructive: it clears existing data first,
 * inside a single transaction, so a malformed file can't leave a half-imported state.
 */
import * as DocumentPicker from 'expo-document-picker';

import { BACKUP_FORMAT_VERSION } from '@/constants/config';
import {
  foldersRepository,
  getDatabase,
  linksRepository,
  relationsRepository,
  tagsRepository,
  type FolderLinkRow,
  type LinkTagRow,
} from '@/database';
import type { Folder, Link, Tag } from '@/types';

import { fileTimestamp, readFileText, shareFile, writeCacheFile } from './files';

export interface BackupFile {
  app: 'LinkVault';
  type: 'backup';
  version: number;
  createdAt: number;
  data: {
    links: Link[];
    folders: Folder[];
    tags: Tag[];
    linkTags: LinkTagRow[];
    folderLinks: FolderLinkRow[];
  };
}

/** Assemble an in-memory snapshot of the whole database. */
export async function buildBackup(createdAt = Date.now()): Promise<BackupFile> {
  const [links, folders, tags, linkTags, folderLinks] = await Promise.all([
    linksRepository.getAll(),
    foldersRepository.getAll(),
    tagsRepository.getAll(),
    relationsRepository.getAllLinkTags(),
    relationsRepository.getAllFolderLinks(),
  ]);
  return {
    app: 'LinkVault',
    type: 'backup',
    version: BACKUP_FORMAT_VERSION,
    createdAt,
    data: { links, folders, tags, linkTags, folderLinks },
  };
}

/** Validate the parsed JSON is a LinkVault backup and return it typed (throws otherwise). */
export function validateBackup(raw: unknown): BackupFile {
  const obj = raw as Partial<BackupFile> | null;
  if (!obj || obj.app !== 'LinkVault' || obj.type !== 'backup' || !obj.data) {
    throw new Error('This file is not a LinkVault backup.');
  }
  const { data } = obj;
  if (
    !Array.isArray(data.links) ||
    !Array.isArray(data.folders) ||
    !Array.isArray(data.tags) ||
    !Array.isArray(data.linkTags) ||
    !Array.isArray(data.folderLinks)
  ) {
    throw new Error('This backup file is corrupt or incomplete.');
  }
  return obj as BackupFile;
}

const bit = (value: boolean): number => (value ? 1 : 0);

/** Replace all data with a validated backup. Preserves primary keys and relations. */
export async function restoreBackup(backup: BackupFile): Promise<{
  links: number;
  folders: number;
  tags: number;
}> {
  const db = getDatabase();

  await db.withTransactionAsync(async () => {
    // Clear existing data as the first step INSIDE the restore transaction (not before it), so if
    // any insert below fails on a malformed backup, the whole thing rolls back and the user keeps
    // their original library instead of being left with an empty database.
    await db.execAsync(`
      DELETE FROM link_tags;
      DELETE FROM folder_links;
      DELETE FROM links;
      DELETE FROM folders;
      DELETE FROM tags;
      DELETE FROM sqlite_sequence;
    `);

    for (const f of backup.data.folders) {
      await db.runAsync(
        'INSERT INTO folders (id, name, icon, color, position, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [f.id, f.name, f.icon, f.color, f.position, f.createdAt, f.updatedAt],
      );
    }
    for (const t of backup.data.tags) {
      await db.runAsync('INSERT INTO tags (id, name, createdAt) VALUES (?, ?, ?)', [
        t.id,
        t.name,
        t.createdAt,
      ]);
    }
    for (const l of backup.data.links) {
      await db.runAsync(
        `INSERT INTO links
          (id, title, url, normalizedUrl, host, description, image, favicon, siteName, notes,
           favorite, archived, readLater, pinned, readAt, lastOpenedAt, visitCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          l.id,
          l.title,
          l.url,
          l.normalizedUrl,
          l.host,
          l.description,
          l.image,
          l.favicon,
          l.siteName,
          l.notes,
          bit(l.favorite),
          bit(l.archived),
          bit(l.readLater),
          bit(l.pinned),
          l.readAt,
          l.lastOpenedAt,
          l.visitCount,
          l.createdAt,
          l.updatedAt,
        ],
      );
    }
    for (const lt of backup.data.linkTags) {
      await db.runAsync('INSERT OR IGNORE INTO link_tags (linkId, tagId) VALUES (?, ?)', [
        lt.linkId,
        lt.tagId,
      ]);
    }
    for (const fl of backup.data.folderLinks) {
      await db.runAsync('INSERT OR IGNORE INTO folder_links (folderId, linkId) VALUES (?, ?)', [
        fl.folderId,
        fl.linkId,
      ]);
    }
  });

  return {
    links: backup.data.links.length,
    folders: backup.data.folders.length,
    tags: backup.data.tags.length,
  };
}

/** Create a backup file and share it. */
export async function createBackup(): Promise<{ uri: string; shared: boolean }> {
  const backup = await buildBackup();
  const uri = writeCacheFile(`linkvault-backup-${fileTimestamp()}.json`, JSON.stringify(backup));
  const shared = await shareFile(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save LinkVault backup',
  });
  return { uri, shared };
}

/** Prompt for a backup file and restore it. Returns null if the user cancelled. */
export async function pickAndRestoreBackup(): Promise<{
  links: number;
  folders: number;
  tags: number;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const text = await readFileText(result.assets[0].uri);
  const backup = validateBackup(JSON.parse(text));
  return restoreBackup(backup);
}
