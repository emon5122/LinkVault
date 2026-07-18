import { formatCount, formatRelativeTime, pluralize, singleLine, truncate } from '../format';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-19T12:00:00Z').getTime();
  it('formats recent times', () => {
    expect(formatRelativeTime(now, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m');
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3h');
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2d');
    expect(formatRelativeTime(now - 2 * 7 * 86_400_000, now)).toBe('2w');
  });
  it('falls back to an absolute date beyond a month', () => {
    expect(formatRelativeTime(now - 60 * 86_400_000, now)).toMatch(/\d{4}/);
  });
});

describe('formatCount', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1200)).toBe('1.2k');
    expect(formatCount(2000)).toBe('2k');
    expect(formatCount(3_400_000)).toBe('3.4m');
  });
});

describe('pluralize', () => {
  it('pluralizes based on count', () => {
    expect(pluralize(1, 'link')).toBe('1 link');
    expect(pluralize(3, 'link')).toBe('3 links');
    expect(pluralize(2, 'entry', 'entries')).toBe('2 entries');
  });
});

describe('truncate / singleLine', () => {
  it('truncates with an ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
    expect(truncate('hi', 5)).toBe('hi');
  });
  it('collapses whitespace', () => {
    expect(singleLine('a\n  b\t c')).toBe('a b c');
  });
});
