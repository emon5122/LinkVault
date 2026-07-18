/**
 * Domain models and their raw SQLite row counterparts.
 *
 * SQLite has no boolean type, so `*Row` types carry 0/1 integers and nullable columns as `null`.
 * The repository layer maps rows to the richer domain types below.
 */

/** SQLite booleans are stored as 0 | 1. */
export type SqlBool = 0 | 1;

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

export interface LinkRow {
  id: number;
  title: string;
  url: string;
  normalizedUrl: string;
  host: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  notes: string | null;
  favorite: SqlBool;
  archived: SqlBool;
  readLater: SqlBool;
  pinned: SqlBool;
  readAt: number | null;
  lastOpenedAt: number | null;
  visitCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Link {
  id: number;
  title: string;
  url: string;
  normalizedUrl: string;
  host: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  notes: string | null;
  favorite: boolean;
  archived: boolean;
  readLater: boolean;
  pinned: boolean;
  readAt: number | null;
  lastOpenedAt: number | null;
  visitCount: number;
  createdAt: number;
  updatedAt: number;
}

/** A link joined with its folder + tag relations, used by detail/list views. */
export interface LinkWithRelations extends Link {
  folders: Folder[];
  tags: Tag[];
}

/** Fields accepted when creating a link. Metadata fields are optional. */
export interface NewLinkInput {
  url: string;
  title?: string;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  siteName?: string | null;
  notes?: string | null;
  favorite?: boolean;
  archived?: boolean;
  readLater?: boolean;
  pinned?: boolean;
  folderIds?: number[];
  tagIds?: number[];
}

export interface UpdateLinkInput {
  title?: string;
  url?: string;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  siteName?: string | null;
  notes?: string | null;
  favorite?: boolean;
  archived?: boolean;
  readLater?: boolean;
  pinned?: boolean;
  folderIds?: number[];
  tagIds?: number[];
}

// ---------------------------------------------------------------------------
// Folder
// ---------------------------------------------------------------------------

export interface FolderRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: number;
  name: string;
  icon: string;
  color: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

/** Folder plus a denormalized count of the links it contains. */
export interface FolderWithCount extends Folder {
  linkCount: number;
}

export interface NewFolderInput {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateFolderInput {
  name?: string;
  icon?: string;
  color?: string;
  position?: number;
}

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export interface TagRow {
  id: number;
  name: string;
  createdAt: number;
}

export interface Tag {
  id: number;
  name: string;
  createdAt: number;
}

export interface TagWithCount extends Tag {
  linkCount: number;
}

// ---------------------------------------------------------------------------
// Query shapes
// ---------------------------------------------------------------------------

/** The high-level collection a link list is scoped to. */
export type LinkScope =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'readLater' }
  | { type: 'archive' }
  | { type: 'pinned' }
  | { type: 'recent' }
  | { type: 'recentlyOpened' }
  | { type: 'folder'; folderId: number }
  | { type: 'tag'; tagId: number }
  | { type: 'search'; query: string };

export type LinkSort =
  | 'createdDesc'
  | 'createdAsc'
  | 'updatedDesc'
  | 'titleAsc'
  | 'titleDesc'
  | 'mostVisited';

export interface LinkListParams {
  scope: LinkScope;
  sort?: LinkSort;
  /** When false (default), archived links are excluded from non-archive scopes. */
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

/** A search hit carries the link plus the matched snippet fields for highlighting. */
export interface SearchResult {
  link: Link;
  matchedFields: string[];
}
