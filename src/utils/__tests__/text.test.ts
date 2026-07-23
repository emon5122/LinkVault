import { readingProgress, splitSentences } from '../text';

describe('splitSentences', () => {
  it('splits on sentence terminators', () => {
    const result = splitSentences('One thing. Two things! Three?');
    expect(result.map((s) => s.text)).toEqual(['One thing.', 'Two things!', 'Three?']);
  });

  it('reports offsets that index back into the source', () => {
    const source = 'First one. Second one.';
    const [first, second] = splitSentences(source);
    expect(source.slice(first.start, first.end)).toBe('First one.');
    expect(source.slice(second.start, second.end)).toBe('Second one.');
  });

  it('does not split on common abbreviations', () => {
    expect(splitSentences('Dr. Smith wrote it.').map((s) => s.text)).toEqual([
      'Dr. Smith wrote it.',
    ]);
    expect(splitSentences('Use React, Vue, etc. for this.').map((s) => s.text)).toEqual([
      'Use React, Vue, etc. for this.',
    ]);
  });

  it('does not split on initials', () => {
    expect(splitSentences('J. R. R. Tolkien wrote it.')).toHaveLength(1);
  });

  it('does not split a decimal or a version number', () => {
    expect(splitSentences('Version 4.5 shipped today.')).toHaveLength(1);
  });

  it('keeps a closing quote with its sentence', () => {
    const result = splitSentences('He said "go." Then he left.');
    expect(result.map((s) => s.text)).toEqual(['He said "go."', 'Then he left.']);
  });

  it('handles text with no terminator', () => {
    expect(splitSentences('a bare fragment').map((s) => s.text)).toEqual(['a bare fragment']);
  });

  it('returns nothing for blank input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   ')).toEqual([]);
  });

  it('breaks up an over-long run so it stays tappable', () => {
    const long = `${'word '.repeat(200)}end.`;
    const result = splitSentences(long);
    expect(result.length).toBeGreaterThan(1);
    expect(Math.max(...result.map((s) => s.text.length))).toBeLessThanOrEqual(400);
  });

  it('keeps offsets monotonic and non-overlapping', () => {
    const source = 'Alpha one. Beta two! Gamma three? Delta four.';
    const result = splitSentences(source);
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].end);
    }
  });
});

describe('readingProgress', () => {
  it('reports a percentage of blocks read', () => {
    expect(readingProgress(0, 10)).toBe(10);
    expect(readingProgress(9, 10)).toBe(100);
  });

  it('is safe for an empty article', () => {
    expect(readingProgress(0, 0)).toBe(0);
  });
});
