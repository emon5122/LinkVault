/** Convert raw SQLite rows (0/1 ints, nullable columns) into the richer domain models. */
import type {
  Folder,
  FolderRow,
  Highlight,
  HighlightRow,
  Link,
  LinkRow,
  Tag,
  TagRow,
} from '@/types';

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
    // v2 columns. Rows written before the migration read back as null/undefined, so coalesce to
    // null rather than trusting the driver to supply the column at all.
    content: row.content ?? null,
    excerpt: row.excerpt ?? null,
    byline: row.byline ?? null,
    wordCount: row.wordCount ?? null,
    extractedAt: row.extractedAt ?? null,
    status: row.status ?? null,
    statusCode: row.statusCode ?? null,
    checkedAt: row.checkedAt ?? null,
    archiveUrl: row.archiveUrl ?? null,
    archivedAt: row.archivedAt ?? null,
  };
}

export function rowToHighlight(row: HighlightRow): Highlight {
  return {
    id: row.id,
    linkId: row.linkId,
    text: row.text,
    note: row.note,
    color: row.color,
    blockIndex: row.blockIndex,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    createdAt: row.createdAt,
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
