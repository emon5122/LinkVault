import { ensureProtocol, extractHost, getDomain, isValidUrl, normalizeUrl, titleFromUrl } from '../url';

// Small helper to compare de-dupe keys through the public normalizeUrl.
function canonicalKeyEquals(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

describe('ensureProtocol', () => {
  it('adds https to bare hosts', () => {
    expect(ensureProtocol('example.com')).toBe('https://example.com');
    expect(ensureProtocol('example.com/path')).toBe('https://example.com/path');
  });
  it('leaves existing schemes intact', () => {
    expect(ensureProtocol('http://example.com')).toBe('http://example.com');
    expect(ensureProtocol('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('trims whitespace', () => {
    expect(ensureProtocol('  example.com  ')).toBe('https://example.com');
  });
});

describe('isValidUrl', () => {
  it('accepts http(s) URLs with a dotted host', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('example.com/path?q=1')).toBe(true);
    expect(isValidUrl('http://localhost')).toBe(true);
  });
  it('rejects malformed or non-web URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('mailto:a@b.com')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('extractHost / getDomain', () => {
  it('strips www and lowercases', () => {
    expect(extractHost('https://WWW.Example.com/x')).toBe('example.com');
    expect(getDomain('https://sub.example.com')).toBe('sub.example.com');
  });
  it('getDomain falls back to input when unparseable', () => {
    expect(getDomain('::::')).toBe('::::');
  });
});

describe('normalizeUrl (duplicate detection)', () => {
  it('collapses tracking params, www, fragment, and trailing slash', () => {
    expect(
      canonicalKeyEquals('https://www.example.com/post/?utm_source=x#top', 'http://example.com/post'),
    ).toBe(false); // scheme differs, so not equal — documents that http/https are distinct
    expect(
      canonicalKeyEquals(
        'https://www.example.com/post/?utm_source=x#top',
        'https://example.com/post',
      ),
    ).toBe(true);
  });
  it('sorts query params so order does not matter', () => {
    expect(canonicalKeyEquals('https://a.com/?b=2&a=1', 'https://a.com/?a=1&b=2')).toBe(true);
  });
  it('keeps non-tracking query params', () => {
    expect(normalizeUrl('https://a.com/search?q=hello')).toContain('q=hello');
  });
});

describe('titleFromUrl', () => {
  it('derives a readable title from the last path segment', () => {
    expect(titleFromUrl('https://example.com/blog/my-great-post')).toBe('my great post');
    expect(titleFromUrl('https://example.com/report.pdf')).toBe('report');
  });
  it('falls back to the host when there is no path', () => {
    expect(titleFromUrl('https://example.com')).toBe('example.com');
  });
});
