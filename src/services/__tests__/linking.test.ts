import { extractAllUrls, extractFirstUrl, parseIncomingUrl } from '../linking';

describe('extractAllUrls', () => {
  it('finds every distinct URL in order', () => {
    const text = 'first https://a.com then https://b.com and https://c.com';
    expect(extractAllUrls(text)).toEqual(['https://a.com', 'https://b.com', 'https://c.com']);
  });

  it('strips trailing prose punctuation', () => {
    expect(extractAllUrls('Read https://a.com.')).toEqual(['https://a.com']);
    expect(extractAllUrls('Read https://a.com, then go.')).toEqual(['https://a.com']);
    expect(extractAllUrls('(https://a.com)')).toEqual(['https://a.com']);
  });

  it('keeps meaningful trailing path characters', () => {
    expect(extractAllUrls('https://a.com/path/to/thing')).toEqual(['https://a.com/path/to/thing']);
    expect(extractAllUrls('https://a.com/search?q=1&r=2')).toEqual(['https://a.com/search?q=1&r=2']);
  });

  it('deduplicates on canonical form', () => {
    const urls = extractAllUrls('https://a.com/x https://a.com/x?utm_source=y https://a.com/x#frag');
    expect(urls).toHaveLength(1);
  });

  it('ignores non-http schemes and bare words', () => {
    expect(extractAllUrls('mailto:a@b.com ftp://x.com just words')).toEqual([]);
  });

  it('returns nothing for empty input', () => {
    expect(extractAllUrls('')).toEqual([]);
  });
});

describe('extractFirstUrl', () => {
  it('returns the first URL', () => {
    expect(extractFirstUrl('a https://one.com b https://two.com')).toBe('https://one.com');
  });

  it('returns null when there is none', () => {
    expect(extractFirstUrl('no links here')).toBeNull();
  });
});

describe('parseIncomingUrl', () => {
  it('parses the custom-scheme add intent', () => {
    expect(parseIncomingUrl('linkvault://add?url=https%3A%2F%2Fa.com')).toEqual({
      type: 'add',
      url: 'https://a.com',
    });
  });

  it('parses the app-link add intent', () => {
    expect(parseIncomingUrl('https://linkvault.app/add?url=https%3A%2F%2Fa.com')).toEqual({
      type: 'add',
      url: 'https://a.com',
    });
  });

  it('parses a link id', () => {
    expect(parseIncomingUrl('linkvault://link/42')).toEqual({ type: 'openLink', id: 42 });
  });

  it('treats a bare web URL as something to add', () => {
    expect(parseIncomingUrl('https://example.com/post')).toEqual({
      type: 'add',
      url: 'https://example.com/post',
    });
  });

  it('rejects an unusable link id', () => {
    expect(parseIncomingUrl('linkvault://link/abc')).toBeNull();
  });
});
