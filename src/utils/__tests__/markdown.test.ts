import { escapeMarkdown, markdownToPlainText, parseInline, parseMarkdown } from '../markdown';

describe('parseInline', () => {
  it('parses bold, italic, code, and links', () => {
    expect(parseInline('**bold**')).toEqual([{ type: 'bold', children: [{ type: 'text', value: 'bold' }] }]);
    expect(parseInline('`code`')).toEqual([{ type: 'code', value: 'code' }]);
    expect(parseInline('[label](https://x.com)')).toEqual([
      { type: 'link', label: 'label', href: 'https://x.com' },
    ]);
  });
});

describe('parseMarkdown', () => {
  it('parses headings, lists, and code blocks', () => {
    const blocks = parseMarkdown('# Title\n\n- one\n- two\n\n```\ncode\n```');
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: false });
    expect((blocks[1] as { items: unknown[] }).items).toHaveLength(2);
    expect(blocks[2]).toEqual({ type: 'code', value: 'code' });
  });
  it('groups plain lines into a paragraph', () => {
    const blocks = parseMarkdown('hello world');
    expect(blocks).toEqual([{ type: 'paragraph', children: [{ type: 'text', value: 'hello world' }] }]);
  });
});

describe('escapeMarkdown / markdownToPlainText', () => {
  it('escapes control characters', () => {
    expect(escapeMarkdown('*hi*')).toBe('\\*hi\\*');
  });
  it('strips markdown to plain text', () => {
    expect(markdownToPlainText('# Hi\n\n**bold** [x](y)')).toBe('Hi bold x');
  });
});
