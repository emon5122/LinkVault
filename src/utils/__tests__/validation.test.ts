import { folderFormSchema, linkFormSchema, sanitizeLine, sanitizeText, tagNameSchema } from '../validation';

describe('sanitizeText', () => {
  it('collapses runs of spaces/tabs into a single space', () => {
    expect(sanitizeText('a  b')).toBe('a b');
    expect(sanitizeText('a\tb')).toBe('a b');
  });
  it('preserves newlines', () => {
    expect(sanitizeText('a\nb')).toBe('a\nb');
  });
  it('collapses 3+ blank lines to 2', () => {
    expect(sanitizeText('a\n\n\n\nb')).toBe('a\n\nb');
  });
  it('sanitizeLine removes newlines', () => {
    expect(sanitizeLine('a\nb')).toBe('a b');
  });
});

describe('linkFormSchema', () => {
  const baseFlags = {
    favorite: false,
    readLater: false,
    archived: false,
    pinned: false,
    folderIds: [],
    tagIds: [],
  };

  it('accepts a valid link', () => {
    const result = linkFormSchema.safeParse({
      url: 'https://example.com',
      title: 'Example',
      description: '',
      notes: '',
      ...baseFlags,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid URL', () => {
    const result = linkFormSchema.safeParse({ url: 'not a url', ...baseFlags });
    expect(result.success).toBe(false);
  });
});

describe('folderFormSchema', () => {
  it('requires a valid hex color', () => {
    expect(folderFormSchema.safeParse({ name: 'X', icon: 'folder', color: '#2563eb' }).success).toBe(
      true,
    );
    expect(folderFormSchema.safeParse({ name: 'X', icon: 'folder', color: 'blue' }).success).toBe(
      false,
    );
  });
});

describe('tagNameSchema', () => {
  it('normalizes to lower-case single-spaced', () => {
    expect(tagNameSchema.parse('  React  Native ')).toBe('react native');
  });
  it('rejects empty names', () => {
    expect(tagNameSchema.safeParse('   ').success).toBe(false);
  });
});
