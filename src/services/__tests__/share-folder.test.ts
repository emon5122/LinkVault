import type { Folder, Link } from '@/types';

import { parseTextLinks } from '../import-export';
import {
  buildFolderBundle,
  bundleToParsedLinks,
  folderToQrPayload,
  folderToShareText,
  parseFolderBundle,
  utf8ByteLength,
} from '../share-folder';

const folder: Folder = {
  id: 1,
  name: 'React Resources',
  icon: 'folder',
  color: '#2563eb',
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

function link(id: number, url: string, title: string): Link {
  return {
    id,
    title,
    url,
    normalizedUrl: url,
    host: null,
    description: null,
    image: null,
    favicon: null,
    siteName: null,
    notes: null,
    favorite: false,
    archived: false,
    readLater: false,
    pinned: false,
    readAt: null,
    lastOpenedAt: null,
    visitCount: 0,
    createdAt: 0,
    updatedAt: 0,
    content: null,
    excerpt: null,
    byline: null,
    wordCount: null,
    extractedAt: null,
    status: null,
    statusCode: null,
    checkedAt: null,
    archiveUrl: null,
    archivedAt: null,
  };
}

const links = [
  link(1, 'https://react.dev', 'React docs'),
  link(2, 'https://example.com/guide', 'A guide to things'),
];

describe('folderToShareText', () => {
  it('renders a numbered, human-readable list', () => {
    const text = folderToShareText(folder, links);
    expect(text).toContain('React Resources · 2 links');
    expect(text).toContain('1. React docs');
    expect(text).toContain('https://react.dev');
    expect(text).toContain('Shared from LinkVault');
  });

  it('uses the singular for one link', () => {
    expect(folderToShareText(folder, links.slice(0, 1))).toContain('1 link');
  });

  /**
   * The round trip is the whole point of the text tier: what a person reads in WhatsApp has to be
   * the same bytes the receiving app can parse back into links.
   */
  it('round-trips through the text parser with titles intact', () => {
    const parsed = parseTextLinks(folderToShareText(folder, links));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ url: 'https://react.dev', title: 'React docs' });
    expect(parsed[1]).toMatchObject({
      url: 'https://example.com/guide',
      title: 'A guide to things',
    });
  });
});

describe('parseFolderBundle', () => {
  it('accepts a bundle it produced', () => {
    const json = JSON.stringify(buildFolderBundle(folder, links));
    const parsed = parseFolderBundle(json);
    expect(parsed?.folder.name).toBe('React Resources');
    expect(parsed?.links).toHaveLength(2);
  });

  it('rejects unrelated JSON', () => {
    expect(parseFolderBundle('{"hello":"world"}')).toBeNull();
    expect(parseFolderBundle('{"app":"LinkVault","type":"backup"}')).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(parseFolderBundle('not json at all')).toBeNull();
    expect(parseFolderBundle('')).toBeNull();
  });

  it('drops link entries with no URL', () => {
    const json = JSON.stringify({
      app: 'LinkVault',
      type: 'folder-share',
      version: 1,
      folder: { name: 'X' },
      links: [{ url: 'https://ok.com' }, { title: 'no url' }],
    });
    expect(parseFolderBundle(json)?.links).toHaveLength(1);
  });

  it('files every link into the bundle folder when converted', () => {
    const bundle = parseFolderBundle(JSON.stringify(buildFolderBundle(folder, links)))!;
    const parsed = bundleToParsedLinks(bundle);
    expect(parsed.every((p) => p.folders.includes('React Resources'))).toBe(true);
  });
});

describe('utf8ByteLength', () => {
  it('matches TextEncoder across scripts, emoji, and surrogate pairs', () => {
    const encoder = new TextEncoder();
    for (const sample of ['', 'plain ascii', 'café', 'বাংলা ভাষা', '日本語のテキスト', '👩‍💻 emoji 🎉', '𝔘𝔫𝔦𝔠𝔬𝔡𝔢']) {
      expect(utf8ByteLength(sample)).toBe(encoder.encode(sample).length);
    }
  });
});

describe('folderToQrPayload', () => {
  it('keeps titles when the folder is small', () => {
    const result = folderToQrPayload(folder, links);
    expect(result.omitted).toBe(0);
    expect(result.payload).toContain('React docs');
    expect(parseFolderBundle(result.payload)?.links).toHaveLength(2);
  });

  it('drops titles before it drops links', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      link(i, `https://example.com/${i}`, `A fairly long descriptive title number ${i}`),
    );
    const result = folderToQrPayload(folder, many);
    expect(result.payload).not.toContain('descriptive title');
    expect(result.included).toBe(40);
  });

  it('truncates and reports the count when even bare URLs will not fit', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      link(i, `https://example.com/some/longer/path/segment/${i}`, `Title ${i}`),
    );
    const result = folderToQrPayload(folder, many);
    expect(result.omitted).toBeGreaterThan(0);
    expect(result.included + result.omitted).toBe(200);
    expect(utf8ByteLength(result.payload)).toBeLessThanOrEqual(2200);
    // Whatever survived must still be a valid bundle.
    expect(parseFolderBundle(result.payload)?.links).toHaveLength(result.included);
  });

  it('produces a scannable payload for an empty folder', () => {
    const result = folderToQrPayload(folder, []);
    expect(result.included).toBe(0);
    expect(parseFolderBundle(result.payload)?.links).toHaveLength(0);
  });
});
