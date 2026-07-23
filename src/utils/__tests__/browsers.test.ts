import { browserDisplayName } from '@/constants/browsers';

describe('browserDisplayName', () => {
  it('names the browsers people actually pick', () => {
    expect(browserDisplayName('com.android.chrome')).toBe('Chrome');
    expect(browserDisplayName('org.mozilla.firefox')).toBe('Firefox');
    expect(browserDisplayName('com.microsoft.emmx')).toBe('Microsoft Edge');
    expect(browserDisplayName('com.sec.android.app.sbrowser')).toBe('Samsung Internet');
    expect(browserDisplayName('com.duckduckgo.mobile.android')).toBe('DuckDuckGo');
  });

  it('derives something readable for an unknown package', () => {
    expect(browserDisplayName('com.example.coolbrowser')).toBe('Coolbrowser');
  });

  it('never returns an empty label', () => {
    for (const input of ['', 'x', '...', 'com.']) {
      expect(browserDisplayName(input).length).toBeGreaterThan(0);
    }
  });
});
