import { highlightMatches } from '../highlight';

describe('highlightMatches', () => {
  it('marks matching segments case-insensitively', () => {
    expect(highlightMatches('Hello World', 'world')).toEqual([
      { text: 'Hello ', match: false },
      { text: 'World', match: true },
    ]);
  });
  it('matches multiple terms', () => {
    const segments = highlightMatches('the quick brown fox', 'quick fox');
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(['quick', 'fox']);
  });
  it('returns a single unmatched segment when the query is empty', () => {
    expect(highlightMatches('abc', '')).toEqual([{ text: 'abc', match: false }]);
  });
  it('escapes regex metacharacters in the query', () => {
    expect(highlightMatches('a.b.c', '.')).toContainEqual({ text: '.', match: true });
  });
});
