/**
 * Friendly names for Android browser packages.
 *
 * `expo-web-browser` reports which browsers can handle Custom Tabs, but only as package names —
 * there is no API for the installed app's display label. This table covers the browsers people
 * actually pick; anything unrecognized falls back to a name derived from the package id, so an
 * obscure browser still shows something readable rather than `com.foo.bar`.
 */
const BROWSER_NAMES: Record<string, string> = {
  'com.android.chrome': 'Chrome',
  'com.chrome.beta': 'Chrome Beta',
  'com.chrome.dev': 'Chrome Dev',
  'com.chrome.canary': 'Chrome Canary',
  'org.mozilla.firefox': 'Firefox',
  'org.mozilla.firefox_beta': 'Firefox Beta',
  'org.mozilla.fenix': 'Firefox Nightly',
  'org.mozilla.focus': 'Firefox Focus',
  'com.microsoft.emmx': 'Microsoft Edge',
  'com.brave.browser': 'Brave',
  'com.brave.browser_beta': 'Brave Beta',
  'com.sec.android.app.sbrowser': 'Samsung Internet',
  'com.opera.browser': 'Opera',
  'com.opera.browser.beta': 'Opera Beta',
  'com.opera.mini.native': 'Opera Mini',
  'com.opera.gx': 'Opera GX',
  'com.duckduckgo.mobile.android': 'DuckDuckGo',
  'com.vivaldi.browser': 'Vivaldi',
  'com.kiwibrowser.browser': 'Kiwi Browser',
  'org.torproject.torbrowser': 'Tor Browser',
  'com.yandex.browser': 'Yandex',
  'com.ecosia.android': 'Ecosia',
  'com.qwant.liberty': 'Qwant',
  'com.UCMobile.intl': 'UC Browser',
  'com.cloudmosa.puffinFree': 'Puffin',
  'acr.browser.lightning': 'Lightning',
  'org.chromium.webview_shell': 'WebView Shell',
};

/** Human-readable label for a browser package id. Never returns an empty string. */
export function browserDisplayName(packageName: string): string {
  const known = BROWSER_NAMES[packageName];
  if (known) return known;

  // Fall back to the most descriptive-looking segment: "com.foo.coolbrowser" -> "Coolbrowser".
  const segments = packageName.split('.').filter(Boolean);
  const last = segments[segments.length - 1] ?? packageName;
  const label = last.charAt(0).toUpperCase() + last.slice(1);
  // A blank label would render as an empty, unselectable-looking row in the picker.
  return label || 'Unknown browser';
}
