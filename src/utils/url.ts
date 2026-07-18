/**
 * URL helpers: validation, normalization (for duplicate detection), and metadata derivation.
 *
 * All functions are pure and are unit-tested in `src/utils/__tests__/url.test.ts`.
 * In the app, `react-native-url-polyfill/auto` (imported at the root layout) provides a spec
 * compliant `URL`/`URLSearchParams`; Node supplies the same globals during tests.
 */

/** Query params that only track campaigns/clicks and should be dropped for dedupe/tidiness. */
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
  'ref_src',
  'spm',
  'yclid',
  '_hsenc',
  '_hsmi',
];

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Trim input and add `https://` when the user pasted a bare host like `example.com/path`. */
export function ensureProtocol(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (URL_LIKE.test(trimmed)) return trimmed;
  // Leave non-web schemes (mailto:, tel:) untouched; otherwise assume https.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function tryParseUrl(input: string): URL | null {
  try {
    return new URL(ensureProtocol(input));
  } catch {
    return null;
  }
}

/** True only for syntactically valid http(s) URLs with a dotted host or localhost. */
export function isValidUrl(input: string): boolean {
  const url = tryParseUrl(input);
  if (!url) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname;
  if (!host) return false;
  return host === 'localhost' || host.includes('.');
}

/** Host without a leading `www.`, lower-cased. Returns null for unparseable input. */
export function extractHost(input: string): string | null {
  const url = tryParseUrl(input);
  if (!url) return null;
  return url.hostname.replace(/^www\./i, '').toLowerCase();
}

/** Display host, falling back to the raw input when it can't be parsed. Never null. */
export function getDomain(input: string): string {
  return extractHost(input) ?? input;
}

/**
 * Canonical form used to detect duplicates. Lower-cases scheme+host, strips `www.`, default
 * ports, tracking params, the fragment, and a trailing slash. Query params are sorted so that
 * `?b=2&a=1` and `?a=1&b=2` collapse to the same key.
 */
export function normalizeUrl(input: string): string {
  const url = tryParseUrl(input);
  if (!url) return input.trim().toLowerCase();

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
  url.hash = '';

  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param);
  }
  url.searchParams.sort();

  let result = url.toString();
  // Drop a trailing slash on the path when there is no query string.
  if (result.endsWith('/') && !url.search) {
    result = result.slice(0, -1);
  }
  return result;
}

/** Google's favicon proxy — a reliable fallback when a site exposes no explicit icon. */
export function faviconUrlForHost(host: string, size = 64): string | null {
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

/** A short, human-friendly label for a URL (host + first path segment). */
export function prettyUrlLabel(input: string): string {
  const url = tryParseUrl(input);
  if (!url) return input;
  const host = url.hostname.replace(/^www\./i, '');
  const firstSegment = url.pathname.split('/').filter(Boolean)[0];
  return firstSegment ? `${host}/${firstSegment}` : host;
}

/** Scheme + host origin ("https://example.com"), or null when unparseable. */
export function getOrigin(input: string): string | null {
  const url = tryParseUrl(input);
  return url ? url.origin : null;
}

/** Resolve a possibly-relative URL (e.g. "/favicon.ico", "//cdn/x.png") against a base page URL. */
export function resolveUrl(maybeRelative: string, base: string): string | null {
  const value = maybeRelative?.trim();
  if (!value) return null;
  try {
    return new URL(value, ensureProtocol(base)).href;
  } catch {
    return null;
  }
}

/** Derive a reasonable title from a URL when no page title is available. */
export function titleFromUrl(input: string): string {
  const url = tryParseUrl(input);
  if (!url) return input.trim();
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last) {
    return decodeURIComponent(last)
      .replace(/[-_]+/g, ' ')
      .replace(/\.[a-z0-9]{1,5}$/i, '')
      .trim();
  }
  return url.hostname.replace(/^www\./i, '');
}
