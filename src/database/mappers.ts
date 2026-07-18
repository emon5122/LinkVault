/** Convert raw SQLite rows (0/1 ints, nullable columns) into the richer domain models. */
import type { Folder, FolderRow, Link, LinkRow, Tag, TagRow } from '@/types';

const bool = (value: number): boolean => value === 1;

export function rowToLink(row: LinkRow): Link {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    normalizedUrl: row.normalizedUrl,
    host: row.host,
    description: row.description,
    image: row.image,
    favicon: row.favicon,
    siteName: row.siteName,
    notes: row.notes,
    favorite: bool(row.favorite),
    archived: bool(row.archived),
    readLater: bool(row.readLater),
    pinned: bool(row.pinned),
    readAt: row.readAt,
    lastOpenedAt: row.lastOpenedAt,
    visitCount: row.visitCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
  };
}
