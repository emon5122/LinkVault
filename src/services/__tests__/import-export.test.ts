/* eslint-disable import/first */
// Isolate the pure parsers from the native-backed persistence/file dependencies.
// jest.mock calls are hoisted above the imports, so import/first is expected here.
jest.mock('@/database', () => ({
  foldersRepository: {},
  linksRepository: {},
  relationsRepository: {},
  tagsRepository: {},
}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('../files', () => ({}));

import {
  linksToCsv,
  linksToMarkdown,
  parseCsvLinks,
  parseHtmlBookmarks,
  parseJsonLinks,
  parseTextLinks,
} from '../import-export';
import type { Link } from '@/types';

describe('parseCsvLinks', () => {
  it('parses url + optional columns and splits tags/folders', () => {
    const csv = 'url,title,tags,folder\nhttps://a.com,Alpha,react;native,Dev\ninvalid,,,';
    const result = parseCsvLinks(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url: 'https://a.com',
      title: 'Alpha',
      tags: ['react', 'native'],
      folders: ['Dev'],
    });
  });
});

describe('parseJsonLinks', () => {
  it('accepts a bare array', () => {
    const json = JSON.stringify([{ url: 'https://a.com', title: 'A', tags: ['x'] }]);
    expect(parseJsonLinks(json)).toEqual([
      expect.objectContaining({ url: 'https://a.com', title: 'A', tags: ['x'] }),
    ]);
  });
  it('accepts an object with a links array and skips invalid urls', () => {
    const json = JSON.stringify({ links: [{ url: 'nope' }, { url: 'https://b.com' }] });
    const result = parseJsonLinks(json);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://b.com');
  });
  it('returns [] for malformed JSON', () => {
    expect(parseJsonLinks('{ not json')).toEqual([]);
  });
});

describe('parseHtmlBookmarks', () => {
  it('extracts anchors and assigns the enclosing folder', () => {
    const html = `
      <DL><p>
        <DT><H3>Work</H3>
        <DL><p>
          <DT><A HREF="https://a.com" TAGS="dev,tools">Alpha</A>
          <DT><A HREF="https://b.com">Beta</A>
        </DL><p>
      </DL>`;
    const result = parseHtmlBookmarks(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      url: 'https://a.com',
      title: 'Alpha',
      folders: ['Work'],
      tags: ['dev', 'tools'],
    });
    expect(result[1].url).toBe('https://b.com');
  });
});

describe('parseTextLinks', () => {
  it('reads a numbered list with the title on the line above', () => {
    const text = ['1. React docs', '   https://react.dev', '2. Vue docs', '   https://vuejs.org'].join(
      '\n',
    );
    const result = parseTextLinks(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ url: 'https://react.dev', title: 'React docs' });
    expect(result[1]).toMatchObject({ url: 'https://vuejs.org', title: 'Vue docs' });
  });

  it('reads a title and URL on the same line', () => {
    const result = parseTextLinks('React docs — https://react.dev');
    expect(result[0]).toMatchObject({ url: 'https://react.dev', title: 'React docs' });
  });

  it('reads Markdown link syntax', () => {
    const result = parseTextLinks('- [React docs](https://react.dev)');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ url: 'https://react.dev', title: 'React docs' });
  });

  it('accepts a bare URL with no title', () => {
    const result = parseTextLinks('https://react.dev');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBeUndefined();
  });

  it('strips sentence punctuation that follows a URL', () => {
    expect(parseTextLinks('See https://react.dev.')[0].url).toBe('https://react.dev');
    expect(parseTextLinks('(see https://react.dev)')[0].url).toBe('https://react.dev');
  });

  it('collapses the same link written two ways', () => {
    const result = parseTextLinks(
      'https://react.dev\nhttps://react.dev?utm_source=newsletter\nhttps://vuejs.org',
    );
    expect(result).toHaveLength(2);
  });

  it('ignores non-web schemes and plain prose', () => {
    expect(parseTextLinks('Just a sentence with no links.')).toEqual([]);
    expect(parseTextLinks('mailto:someone@example.com')).toEqual([]);
  });

  it('does not treat a URL on the preceding line as the next one’s title', () => {
    const result = parseTextLinks('https://a.com\nhttps://b.com');
    expect(result.every((r) => r.title === undefined)).toBe(true);
  });

  it('returns nothing for empty input', () => {
    expect(parseTextLinks('')).toEqual([]);
    expect(parseTextLinks('   ')).toEqual([]);
  });

  it('handles a realistic pasted chat message', () => {
    const text = [
      'hey check these out',
      '',
      'Great intro to hooks',
      'https://react.dev/reference/react',
      '',
      'and this one https://kentcdodds.com/blog too',
      '',
      'sent from my phone',
    ].join('\n');

    const result = parseTextLinks(text);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Great intro to hooks');
    expect(result[1].url).toBe('https://kentcdodds.com/blog');
  });
});

describe('exporters', () => {
  const link: Link = {
    id: 1,
    title: 'Alpha',
    url: 'https://a.com',
    normalizedUrl: 'a.com',
    host: 'a.com',
    description: 'desc',
    image: null,
    favicon: null,
    siteName: 'A',
    notes: null,
    favorite: true,
    archived: false,
    readLater: false,
    pinned: false,
    readAt: null,
    lastOpenedAt: null,
    visitCount: 0,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
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

  it('renders CSV with a header row', () => {
    const csv = linksToCsv([link], new Map([[1, ['react']]]), new Map([[1, ['Dev']]]));
    expect(csv.split('\r\n')[0]).toContain('url');
    expect(csv).toContain('https://a.com');
    expect(csv).toContain('react');
  });

  it('renders Markdown with a link line', () => {
    const md = linksToMarkdown([link], new Map([[1, ['react']]]), 1_700_000_000_000);
    expect(md).toContain('[Alpha](https://a.com)');
    expect(md).toContain('#react');
  });
});
