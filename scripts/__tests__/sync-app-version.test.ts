const { readExpoVersion, setExpoVersion } = require('../sync-app-version');

const APP_JSON = `{
  "expo": {
    "name": "LinkVault",
    "slug": "LinkVault",
    "version": "1.0.0",
    "android": {
      "package": "com.emon5122.linkvault"
    },
    "extra": {
      "version": "should-not-be-touched"
    }
  }
}
`;

describe('setExpoVersion', () => {
  it('updates expo.version', () => {
    expect(readExpoVersion(setExpoVersion(APP_JSON, '1.2.3'))).toBe('1.2.3');
  });

  it('leaves the rest of the file byte-identical', () => {
    const updated = setExpoVersion(APP_JSON, '1.2.3');
    expect(updated).toBe(APP_JSON.replace('"version": "1.0.0"', '"version": "1.2.3"'));
  });

  /** A blanket string replace would rewrite the unrelated "version" under extra. */
  it('does not touch a like-named field elsewhere in the file', () => {
    const updated = setExpoVersion(APP_JSON, '1.2.3');
    expect(JSON.parse(updated).expo.extra.version).toBe('should-not-be-touched');
  });

  it('is a no-op when already in sync', () => {
    expect(setExpoVersion(APP_JSON, '1.0.0')).toBe(APP_JSON);
  });

  it('keeps the result valid JSON', () => {
    expect(() => JSON.parse(setExpoVersion(APP_JSON, '10.20.30'))).not.toThrow();
  });

  it('throws when there is no expo.version to update', () => {
    expect(() => setExpoVersion('{"expo":{"name":"x"}}', '1.2.3')).toThrow(/expo.version/);
  });
});
