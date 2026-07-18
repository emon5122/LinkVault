import { buildLinkCountQuery, buildLinkListQuery, escapeLike, searchTerms } from '../queries';

describe('escapeLike', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off')).toBe('50\\%\\_off');
  });
});

describe('searchTerms', () => {
  it('splits and lower-cases terms', () => {
    expect(searchTerms('  Hello   World ')).toEqual(['hello', 'world']);
    expect(searchTerms('')).toEqual([]);
  });
});

describe('buildLinkListQuery', () => {
  it('hides archived links in default scopes', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'all' } });
    expect(sql).toContain('l.archived = 0');
    expect(sql).toContain('ORDER BY l.createdAt DESC');
  });

  it('filters favorites', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'favorites' } });
    expect(sql).toContain('l.favorite = 1');
    expect(sql).toContain('l.archived = 0');
  });

  it('shows only archived links in the archive scope', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'archive' } });
    expect(sql).toContain('l.archived = 1');
    expect(sql).not.toContain('l.archived = 0');
  });

  it('joins for folder scope and passes the folder id', () => {
    const { sql, args } = buildLinkListQuery({ scope: { type: 'folder', folderId: 7 } });
    expect(sql).toContain('JOIN folder_links fl');
    expect(args).toContain(7);
  });

  it('builds a search predicate with one pattern per field per term', () => {
    const { sql, args } = buildLinkListQuery({ scope: { type: 'search', query: 'react native' } });
    expect(sql).toContain('l.title LIKE ?');
    // 8 fields per term x 2 terms = 16 LIKE args.
    expect(args.filter((a) => a === '%react%')).toHaveLength(8);
    expect(args.filter((a) => a === '%native%')).toHaveLength(8);
  });

  it('applies limit/offset for pagination', () => {
    const { sql, args } = buildLinkListQuery({ scope: { type: 'all' }, limit: 30, offset: 60 });
    expect(sql).toContain('LIMIT ? OFFSET ?');
    expect(args.slice(-2)).toEqual([30, 60]);
  });

  it('sorts recently-opened by open time', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'recentlyOpened' } });
    expect(sql).toContain('ORDER BY l.lastOpenedAt DESC');
  });

  it('maps sort options to ORDER BY', () => {
    expect(buildLinkListQuery({ scope: { type: 'all' }, sort: 'titleAsc' }).sql).toContain(
      'l.title COLLATE NOCASE ASC',
    );
    expect(buildLinkListQuery({ scope: { type: 'all' }, sort: 'mostVisited' }).sql).toContain(
      'l.visitCount DESC',
    );
  });
});

describe('buildLinkCountQuery', () => {
  it('counts with the same conditions', () => {
    const { sql } = buildLinkCountQuery({ type: 'readLater' });
    expect(sql).toContain('SELECT COUNT(*)');
    expect(sql).toContain('l.readLater = 1');
  });
});
