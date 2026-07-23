import {
  buildLinkCountQuery,
  buildLinkListQuery,
  escapeLike,
  ftsPrefixQuery,
  searchTerms,
} from '../queries';

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

describe('ftsPrefixQuery', () => {
  it('quotes the term and makes it a prefix match', () => {
    expect(ftsPrefixQuery('react')).toBe('"react"*');
  });

  it('neutralizes characters FTS5 would read as operators', () => {
    // Unquoted, each of these is a syntax error or an unintended operator.
    expect(ftsPrefixQuery('c++')).toBe('"c"*');
    expect(ftsPrefixQuery('NEAR')).toBe('"NEAR"*');
    expect(ftsPrefixQuery('foo-bar')).toBe('"foo bar"*');
    expect(ftsPrefixQuery('col:val')).toBe('"col val"*');
  });

  it('escapes embedded quotes rather than breaking the phrase', () => {
    expect(ftsPrefixQuery('say"hi')).toBe('"say hi"*');
  });

  it('returns null when nothing indexable remains', () => {
    expect(ftsPrefixQuery('---')).toBeNull();
    expect(ftsPrefixQuery('!!')).toBeNull();
  });

  it('keeps non-latin scripts intact', () => {
    expect(ftsPrefixQuery('বাংলা')).toBe('"বাংলা"*');
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

  it('routes search terms through the FTS index', () => {
    const { sql, args } = buildLinkListQuery({ scope: { type: 'search', query: 'react native' } });
    expect(sql).toContain('links_fts MATCH ?');
    expect(args).toContain('"react"*');
    expect(args).toContain('"native"*');
    // Folder + tag names still need a LIKE scan — they live outside the index.
    expect(args.filter((a) => a === '%react%')).toHaveLength(2);
    expect(args.filter((a) => a === '%native%')).toHaveLength(2);
  });

  it('requires every term to match somewhere (AND across terms)', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'search', query: 'react native' } });
    // Two bracketed per-term groups, joined by AND.
    expect(sql.match(/links_fts MATCH \?/g)).toHaveLength(2);
    expect(sql).toContain(') AND (');
  });

  it('falls back to LIKE for a term the tokenizer would discard', () => {
    const { sql, args } = buildLinkListQuery({ scope: { type: 'search', query: '---' } });
    expect(sql).not.toContain('links_fts MATCH');
    expect(sql).toContain('l.title LIKE ?');
    // 6 link columns + folder + tag.
    expect(args.filter((a) => a === '%---%')).toHaveLength(8);
  });

  it('scopes broken links to failed checks', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'broken' } });
    expect(sql).toContain("l.status IN ('broken', 'unknown')");
  });

  it('scopes readable links to those with stored content', () => {
    const { sql } = buildLinkListQuery({ scope: { type: 'readable' } });
    expect(sql).toContain('l.content IS NOT NULL');
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
