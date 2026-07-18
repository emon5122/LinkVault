import { decodeEntities, parseHtmlMetadata } from '../metadata';

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('caf&#233;')).toBe('café');
    expect(decodeEntities('&#x2764;')).toBe('❤');
  });
});

describe('parseHtmlMetadata', () => {
  const base = 'https://example.com/article';

  it('prefers Open Graph tags', () => {
    const html = `
      <html><head>
        <title>Fallback Title</title>
        <meta property="og:title" content="OG Title" />
        <meta property="og:description" content="A great article" />
        <meta property="og:image" content="/preview.png" />
        <meta property="og:site_name" content="Example" />
        <link rel="icon" href="/favicon.ico" />
      </head></html>`;
    const meta = parseHtmlMetadata(html, base);
    expect(meta.title).toBe('OG Title');
    expect(meta.description).toBe('A great article');
    expect(meta.image).toBe('https://example.com/preview.png');
    expect(meta.favicon).toBe('https://example.com/favicon.ico');
    expect(meta.siteName).toBe('Example');
  });

  it('falls back to <title> and a host favicon', () => {
    const meta = parseHtmlMetadata('<html><head><title>Just a Title</title></head></html>', base);
    expect(meta.title).toBe('Just a Title');
    expect(meta.favicon).toContain('example.com');
    expect(meta.siteName).toBe('example.com');
  });

  it('resolves twitter fallbacks and decodes entities', () => {
    const html = `<meta name="twitter:title" content="Tom &amp; Jerry" />`;
    expect(parseHtmlMetadata(html, base).title).toBe('Tom & Jerry');
  });
});
