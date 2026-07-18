import { parseCsv, parseCsvRecords, toCsv } from '../csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });
  it('handles quoted fields with commas and newlines', () => {
    expect(parseCsv('"a,b","c\nd"')).toEqual([['a,b', 'c\nd']]);
  });
  it('handles escaped double quotes', () => {
    expect(parseCsv('"she said ""hi"""')).toEqual([['she said "hi"']]);
  });
  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('toCsv', () => {
  it('quotes fields that need it and round-trips', () => {
    const rows = [
      ['url', 'title'],
      ['https://a.com', 'Hello, "World"'],
    ];
    const csv = toCsv(rows);
    expect(csv).toContain('"Hello, ""World"""');
    expect(parseCsv(csv)).toEqual(rows);
  });
  it('renders null/undefined as empty', () => {
    expect(toCsv([[null, undefined, 1]])).toBe(',,1');
  });
});

describe('parseCsvRecords', () => {
  it('keys rows by lower-cased header', () => {
    const records = parseCsvRecords('URL,Title\nhttps://a.com,Hi');
    expect(records).toEqual([{ url: 'https://a.com', title: 'Hi' }]);
  });
});
