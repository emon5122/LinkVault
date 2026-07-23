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

/**
 * Build an FTS5 prefix query for a single user term.
 *
 * The term is wrapped as a quoted phrase (doubling any embedded quote) so that characters FTS5
 * treats as operators — `*`, `^`, `:`, `-`, `(`, `NEAR` — are matched literally instead of raising
 * a syntax error on input the user just typed. The trailing `*` makes it a prefix match so results
 * appear while typing.
 *
 * Returns null when the term contains nothing the tokenizer would index (e.g. `--`), in which case
 * the caller falls back to LIKE for that term.
 */
export function ftsPrefixQuery(term: string): string | null {
  // `unicode61` splits on everything that isn't a letter, digit, or combining mark. If nothing
  // survives that, the quoted phrase would be empty and FTS5 would reject the whole query.
  const indexable = term.replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
  if (!indexable) return null;
  return `"${indexable.replace(/"/g, '""')}"*`;
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
    case 'broken':
      where.push("l.status IN ('broken', 'unknown')");
      break;
    case 'readable':
      where.push('l.content IS NOT NULL');
      break;
    case 'search': {
      // Every term must match somewhere (AND across terms, OR across fields) — the same rule the
      // original LIKE-only search used. What changed is *where* a term can match: the link's own
      // text now goes through the FTS index, which also covers the extracted article body.
      for (const term of searchTerms(scope.query)) {
        const pattern = `%${escapeLike(term)}%`;
        const branches: string[] = [];

        const fts = ftsPrefixQuery(term);
        if (fts) {
          branches.push(`l.id IN (SELECT rowid FROM links_fts WHERE links_fts MATCH ?)`);
          args.push(fts);
        } else {
          // Nothing indexable in the term (pure punctuation) — FTS can't answer it, so scan the
          // columns it would have covered.
          branches.push(
            `l.title LIKE ? ESCAPE '\\'`,
            `l.url LIKE ? ESCAPE '\\'`,
            `l.description LIKE ? ESCAPE '\\'`,
            `l.notes LIKE ? ESCAPE '\\'`,
            `l.siteName LIKE ? ESCAPE '\\'`,
            `l.host LIKE ? ESCAPE '\\'`,
          );
          for (let k = 0; k < 6; k += 1) args.push(pattern);
        }

        // Folder and tag names live in other tables, so they stay outside the index.
        branches.push(
          `EXISTS (SELECT 1 FROM folder_links sfl JOIN folders sf ON sf.id = sfl.folderId` +
            ` WHERE sfl.linkId = l.id AND sf.name LIKE ? ESCAPE '\\')`,
          `EXISTS (SELECT 1 FROM link_tags slt JOIN tags st ON st.id = slt.tagId` +
            ` WHERE slt.linkId = l.id AND st.name LIKE ? ESCAPE '\\')`,
        );
        args.push(pattern, pattern);

        where.push(`(${branches.join(' OR ')})`);
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
