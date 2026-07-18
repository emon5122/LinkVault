/**
 * Pure SQL builders for the link list and search. Kept free of the native `expo-sqlite` module so
 * they can be unit-tested under plain Node (see `__tests__/queries.test.ts`).
 */
import type { LinkListParams, LinkScope, LinkSort } from '@/types';

export type SqlArg = string | number;

export interface BuiltQuery {
  sql: string;
  args: SqlArg[];
}

/** Escape LIKE wildcards so a user's `%`/`_` are matched literally (paired with `ESCAPE '\'`). */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Split a search query into non-empty, lower-cased terms. */
export function searchTerms(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

const ORDER_BY: Record<LinkSort, string> = {
  createdDesc: 'l.createdAt DESC',
  createdAsc: 'l.createdAt ASC',
  updatedDesc: 'l.updatedAt DESC',
  titleAsc: 'l.title COLLATE NOCASE ASC',
  titleDesc: 'l.title COLLATE NOCASE DESC',
  mostVisited: 'l.visitCount DESC, l.lastOpenedAt DESC',
};

interface Conditions {
  joins: string[];
  where: string[];
  args: SqlArg[];
}

/** Build the FROM joins + WHERE fragments (and their args) for a given scope. */
function buildConditions(scope: LinkScope, includeArchived: boolean): Conditions {
  const joins: string[] = [];
  const where: string[] = [];
  const args: SqlArg[] = [];

  switch (scope.type) {
    case 'all':
    case 'recent':
      break;
    case 'favorites':
      where.push('l.favorite = 1');
      break;
    case 'readLater':
      where.push('l.readLater = 1');
      break;
    case 'pinned':
      where.push('l.pinned = 1');
      break;
    case 'recentlyOpened':
      where.push('l.lastOpenedAt IS NOT NULL');
      break;
    case 'archive':
      where.push('l.archived = 1');
      break;
    case 'folder':
      joins.push('JOIN folder_links fl ON fl.linkId = l.id AND fl.folderId = ?');
      args.push(scope.folderId);
      break;
    case 'tag':
      joins.push('JOIN link_tags lt ON lt.linkId = l.id AND lt.tagId = ?');
      args.push(scope.tagId);
      break;
    case 'search': {
      for (const term of searchTerms(scope.query)) {
        const pattern = `%${escapeLike(term)}%`;
        where.push(
          `(l.title LIKE ? ESCAPE '\\'` +
            ` OR l.url LIKE ? ESCAPE '\\'` +
            ` OR l.description LIKE ? ESCAPE '\\'` +
            ` OR l.notes LIKE ? ESCAPE '\\'` +
            ` OR l.siteName LIKE ? ESCAPE '\\'` +
            ` OR l.host LIKE ? ESCAPE '\\'` +
            ` OR EXISTS (SELECT 1 FROM folder_links sfl JOIN folders sf ON sf.id = sfl.folderId` +
            ` WHERE sfl.linkId = l.id AND sf.name LIKE ? ESCAPE '\\')` +
            ` OR EXISTS (SELECT 1 FROM link_tags slt JOIN tags st ON st.id = slt.tagId` +
            ` WHERE slt.linkId = l.id AND st.name LIKE ? ESCAPE '\\'))`,
        );
        for (let k = 0; k < 8; k += 1) args.push(pattern);
      }
      break;
    }
  }

  // Archived links are hidden everywhere except the dedicated Archive scope.
  if (scope.type !== 'archive' && !includeArchived) {
    where.push('l.archived = 0');
  }

  return { joins, where, args };
}

/** Build the paginated SELECT for a link list. */
export function buildLinkListQuery(params: LinkListParams): BuiltQuery {
  const { scope, includeArchived = false, limit, offset = 0 } = params;
  const { joins, where, args } = buildConditions(scope, includeArchived);

  // The "recently opened" scope always sorts by open time; every other scope honors `sort`.
  const sort: LinkSort = params.sort ?? 'createdDesc';
  const orderBy = scope.type === 'recentlyOpened' ? 'l.lastOpenedAt DESC' : ORDER_BY[sort];

  let sql = `SELECT l.* FROM links l`;
  if (joins.length) sql += ` ${joins.join(' ')}`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY ${orderBy}, l.id DESC`;

  if (limit != null) {
    sql += ` LIMIT ? OFFSET ?`;
    args.push(limit, offset);
  }

  return { sql, args };
}

/** Build a COUNT(*) for the same conditions (used by badges and section headers). */
export function buildLinkCountQuery(
  scope: LinkScope,
  includeArchived = false,
): BuiltQuery {
  const { joins, where, args } = buildConditions(scope, includeArchived);
  let sql = `SELECT COUNT(*) AS count FROM links l`;
  if (joins.length) sql += ` ${joins.join(' ')}`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  return { sql, args };
}
