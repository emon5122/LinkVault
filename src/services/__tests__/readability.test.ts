import {
  countWords,
  extractArticle,
  extractBalanced,
  parseArticle,
  readingMinutes,
  serializeBlocks,
  type ArticleBlock,
} from '../readability';

/**
 * Distinct paragraphs, each long enough that a pair clears the "boilerplate, not an article"
 * threshold. They must differ from one another — the extractor collapses consecutive identical
 * blocks, which is asserted in its own test below.
 */
const P1 =
  'This first paragraph exists to give the extractor enough real prose that it treats the document as an article rather than a navigation shell it should reject.';
const P2 =
  'A second and clearly different paragraph follows, so the extractor has more than one block to work with and its deduplication rule is not accidentally exercised.';

function page(body: string): string {
  return `<html><head><title>T</title></head><body>${body}</body></html>`;
}

describe('extractBalanced', () => {
  it('returns the inner HTML of a tag', () => {
    expect(extractBalanced('<main><p>hi</p></main>', 'main')).toBe('<p>hi</p>');
  });

  it('tracks nesting rather than stopping at the first close', () => {
    const html = '<article>outer<article>inner</article>tail</article>';
    expect(extractBalanced(html, 'article')).toBe('outer<article>inner</article>tail');
  });

  it('returns null when the tag is absent', () => {
    expect(extractBalanced('<p>hi</p>', 'article')).toBeNull();
  });

  it('falls back to the remainder when the tag is never closed', () => {
    expect(extractBalanced('<main><p>hi</p>', 'main')).toBe('<p>hi</p>');
  });
});

describe('extractArticle', () => {
  it('pulls paragraphs and headings out of an article element', () => {
    const article = extractArticle(
      page(`<article><h1>Title Here</h1><p>${P1}</p><p>${P2}</p></article>`),
    );
    expect(article).not.toBeNull();
    expect(article!.blocks[0]).toEqual({ kind: 'heading', text: 'Title Here' });
    expect(article!.blocks).toHaveLength(3);
  });

  it('drops scripts, styles, and page chrome', () => {
    const article = extractArticle(
      page(
        `<nav><p>Home About Contact Us Today</p></nav>` +
          `<article><p>${P1}</p><p>${P2}</p><script>var x = "should not appear";</script></article>` +
          `<footer><p>Copyright notice goes here for the year</p></footer>`,
      ),
    );
    expect(article).not.toBeNull();
    expect(article!.content).not.toContain('should not appear');
    expect(article!.content).not.toContain('Home About Contact');
    expect(article!.content).not.toContain('Copyright notice');
  });

  it('decodes entities and collapses whitespace', () => {
    const article = extractArticle(
      page(`<article><p>Caf&eacute;   &amp;   bar &mdash; ${P1}</p><p>${P2}</p></article>`),
    );
    expect(article!.blocks[0].text).toContain('Café & bar — ');
  });

  it('classifies list items and quotes', () => {
    const article = extractArticle(
      page(
        `<article><p>${P1}</p><p>${P2}</p><ul><li>First item</li></ul>` +
          `<blockquote>Quoted line</blockquote></article>`,
      ),
    );
    const kinds = article!.blocks.map((b) => b.kind);
    expect(kinds).toContain('listItem');
    expect(kinds).toContain('quote');
  });

  it('skips one- and two-word paragraphs left behind by UI chrome', () => {
    const article = extractArticle(page(`<article><p>Share</p><p>${P1}</p><p>${P2}</p></article>`));
    expect(article!.blocks.every((b) => b.text !== 'Share')).toBe(true);
  });

  it('collapses a repeated adjacent block', () => {
    const article = extractArticle(page(`<article><p>${P1}</p><p>${P1}</p><p>${P2}</p></article>`));
    expect(article!.blocks).toHaveLength(2);
  });

  it('reads the byline from meta tags', () => {
    const html = `<html><head><meta name="author" content="Ada Lovelace"></head><body><article><p>${P1}</p><p>${P2}</p></article></body></html>`;
    expect(extractArticle(html)!.byline).toBe('Ada Lovelace');
  });

  it('returns null for a page with too little text', () => {
    expect(extractArticle(page('<article><p>Tiny thing here.</p></article>'))).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractArticle('')).toBeNull();
  });

  it('counts words and builds an excerpt', () => {
    const article = extractArticle(page(`<article><p>${P1}</p><p>${P2}</p></article>`))!;
    expect(article.wordCount).toBeGreaterThan(40);
    expect(article.excerpt.length).toBeGreaterThan(0);
    expect(article.excerpt.length).toBeLessThanOrEqual(241);
  });

  it('falls back to the body when there is no semantic container', () => {
    const article = extractArticle(page(`<div><p>${P1}</p><p>${P2}</p></div>`));
    expect(article).not.toBeNull();
    expect(article!.blocks).toHaveLength(2);
  });

  it('keeps each line of a code block separate', () => {
    const article = extractArticle(
      page(`<article><p>${P1}</p><p>${P2}</p><pre>line one<br>line two</pre></article>`),
    );
    const code = article!.blocks.filter((b) => b.kind === 'code');
    expect(code.map((b) => b.text)).toEqual(['line one', 'line two']);
  });
});

describe('serializeBlocks / parseArticle', () => {
  const blocks: ArticleBlock[] = [
    { kind: 'heading', text: 'Heading' },
    { kind: 'subheading', text: 'Sub' },
    { kind: 'paragraph', text: 'A normal paragraph.' },
    { kind: 'listItem', text: 'An item' },
    { kind: 'quote', text: 'A quote' },
    { kind: 'code', text: 'const x = 1;' },
  ];

  it('round-trips every block kind', () => {
    expect(parseArticle(serializeBlocks(blocks))).toEqual(blocks);
  });

  it('round-trips a paragraph that starts with a block marker', () => {
    // Without escaping, "- like this" would come back as a list item.
    const tricky: ArticleBlock[] = [
      { kind: 'paragraph', text: '- like this' },
      { kind: 'paragraph', text: '> and this' },
      { kind: 'paragraph', text: '# and this too' },
    ];
    expect(parseArticle(serializeBlocks(tricky))).toEqual(tricky);
  });

  it('returns nothing for null or empty content', () => {
    expect(parseArticle(null)).toEqual([]);
    expect(parseArticle('')).toEqual([]);
  });

  it('survives a full extract → store → parse round trip', () => {
    const article = extractArticle(
      page(`<article><h1>Head</h1><p>${P1}</p><p>${P2}</p><ul><li>Item</li></ul></article>`),
    )!;
    expect(parseArticle(article.content)).toEqual(article.blocks);
  });
});

describe('countWords / readingMinutes', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('one two  three')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });

  it('estimates reading time, never below one minute for real content', () => {
    expect(readingMinutes(220)).toBe(1);
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(2200)).toBe(10);
  });

  it('reports zero when there is nothing to read', () => {
    expect(readingMinutes(null)).toBe(0);
    expect(readingMinutes(0)).toBe(0);
  });
});
