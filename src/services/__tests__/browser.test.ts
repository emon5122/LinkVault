/* eslint-disable import/first */
// Isolate the pure intent-URI builder from the native browser/clipboard modules.
jest.mock('expo-clipboard', () => ({}));
jest.mock('expo-web-browser', () => ({ WebBrowserPresentationStyle: {} }));
jest.mock('@/store/settings', () => ({ useSettingsStore: { getState: () => ({}) } }));

import { buildIntentUri } from '../browser';

const CHROME = 'com.android.chrome';

describe('buildIntentUri', () => {
  it('targets the chosen package', () => {
    expect(buildIntentUri('https://example.com/page', CHROME)).toBe(
      `intent://example.com/page#Intent;scheme=https;package=${CHROME};end`,
    );
  });

  it('preserves the query string', () => {
    expect(buildIntentUri('https://example.com/s?q=hi&p=2', CHROME)).toBe(
      `intent://example.com/s?q=hi&p=2#Intent;scheme=https;package=${CHROME};end`,
    );
  });

  it('carries the original scheme through', () => {
    expect(buildIntentUri('http://example.com/', CHROME)).toContain('scheme=http;');
  });

  it('upgrades a bare host so the intent is well-formed', () => {
    expect(buildIntentUri('example.com/path', CHROME)).toBe(
      `intent://example.com/path#Intent;scheme=https;package=${CHROME};end`,
    );
  });

  it('keeps a non-default port', () => {
    expect(buildIntentUri('https://example.com:8443/x', CHROME)).toContain('example.com:8443/x');
  });

  /**
   * The fragment slot in an intent URI is occupied by the Intent block, so a link with an anchor
   * cannot round-trip. Declining is deliberate — the caller falls back to the default browser,
   * which at least lands on the right part of the page.
   */
  it('declines a URL with a fragment rather than dropping the anchor', () => {
    expect(buildIntentUri('https://example.com/docs#install', CHROME)).toBeNull();
  });

  it('returns null for input it cannot parse', () => {
    expect(buildIntentUri('', CHROME)).toBeNull();
    expect(buildIntentUri('   ', CHROME)).toBeNull();
  });
});
