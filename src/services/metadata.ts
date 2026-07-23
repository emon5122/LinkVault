/**
 * Open Graph / HTML metadata fetching.
 *
 * React Native has no DOM parser, so metadata is extracted with targeted regexes over the raw HTML.
 * The pure `parseHtmlMetadata` is unit-tested; `fetchMetadata` wraps it with a timed `fetch` and
 * graceful fallbacks (a page that can't be fetched still yields a host-based favicon + title).
 */
import { METADATA_FETCH_TIMEOUT_MS } from '@/constants/config';
import { extractHost, faviconUrlForHost, resolveUrl, titleFromUrl } from '@/utils/url';

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
}

const EMPTY: LinkMetadata = {
  title: null,
  description: null,
  image: null,
  favicon: null,
  siteName: null,
};

/** Read a single attribute value from an HTML tag string (handles ", ', and unquoted values). */
function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s">]+))`, 'i');
  const m = re.exec(tag);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

/**
 * Named HTML entities worth decoding.
 *
 * Numeric references are handled generically below; named ones have to be tabulated. This covers
 * typographic punctuation and the Latin-1 letters, which is what actually turns up in article
 * bodies — anything rarer is left as written rather than shipping the full HTML5 entity table.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  // Typography
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  bdquo: '„',
  bull: '•',
  middot: '·',
  laquo: '«',
  raquo: '»',
  lsaquo: '‹',
  rsaquo: '›',
  prime: '′',
  dagger: '†',
  permil: '‰',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  shy: '',
  zwnj: '',
  zwj: '',
  // Symbols
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  para: '¶',
  sect: '§',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  curren: '¤',
  iexcl: '¡',
  iquest: '¿',
  larr: '←',
  rarr: '→',
  harr: '↔',
  // Latin-1 letters
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  yuml: 'ÿ',
  szlig: 'ß',
  eth: 'ð',
  thorn: 'þ',
};

// Uppercase spellings (&Eacute;, &Ouml;) follow mechanically from the lowercase letters above.
for (const [name, value] of Object.entries(NAMED_ENTITIES)) {
  if (/^[a-z]+$/.test(name) && value.toLowerCase() !== value.toUpperCase()) {
    const capitalized = name[0].toUpperCase() + name.slice(1);
    if (!(capitalized in NAMED_ENTITIES)) NAMED_ENTITIES[capitalized] = value.toUpperCase();
  }
}

/** Decode the HTML entities that commonly appear in titles, descriptions, and article bodies. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,31});/g, (match, name: string) =>
      name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : match,
    )
    .trim();
}

function collectMetaTags(html: string): Record<string, string> {
  const map: Record<string, string> = {};
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = getAttr(tag, 'property') ?? getAttr(tag, 'name') ?? getAttr(tag, 'itemprop');
    const content = getAttr(tag, 'content');
    if (key && content) {
      const normalizedKey = key.toLowerCase();
      if (!(normalizedKey in map)) map[normalizedKey] = decodeEntities(content);
    }
  }
  return map;
}

function findFaviconHref(html: string): string | null {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  let appleTouch: string | null = null;
  for (const tag of links) {
    const rel = (getAttr(tag, 'rel') ?? '').toLowerCase();
    const href = getAttr(tag, 'href');
    if (!href) continue;
    if (rel.includes('apple-touch-icon')) appleTouch = href;
    if (rel === 'icon' || rel === 'shortcut icon' || rel.includes('icon')) {
      // Prefer a standard icon; keep looking for apple-touch as a higher-res fallback.
      return href;
    }
  }
  return appleTouch;
}

/** Extract metadata from raw HTML. `baseUrl` resolves relative image/favicon URLs. */
export function parseHtmlMetadata(html: string, baseUrl: string): LinkMetadata {
  const meta = collectMetaTags(html);

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const rawTitle =
    meta['og:title'] ?? meta['twitter:title'] ?? (titleTag ? decodeEntities(titleTag[1]) : null);

  const description = meta['og:description'] ?? meta['twitter:description'] ?? meta.description ?? null;
  const rawImage = meta['og:image'] ?? meta['og:image:url'] ?? meta['twitter:image'] ?? null;
  const siteName = meta['og:site_name'] ?? null;

  const faviconHref = findFaviconHref(html);
  const host = extractHost(baseUrl);

  return {
    title: rawTitle?.replace(/\s+/g, ' ').trim() || null,
    description: description?.replace(/\s+/g, ' ').trim() || null,
    image: rawImage ? resolveUrl(rawImage, baseUrl) : null,
    favicon: faviconHref
      ? resolveUrl(faviconHref, baseUrl)
      : host
        ? faviconUrlForHost(host)
        : null,
    siteName: siteName?.trim() || host,
  };
}

/** The browser-ish identity used for every outbound page request. */
export const FETCH_USER_AGENT =
  'Mozilla/5.0 (compatible; LinkVault/1.0; +https://linkvault.app) AppleWebKit/537.36';

/** Largest page we will parse. Beyond this, sites are almost always app shells, not articles. */
const MAX_HTML_BYTES = 600_000;

export interface FetchedPage {
  html: string;
  /** URL after redirects — the correct base for resolving relative asset URLs. */
  finalUrl: string;
}

/**
 * Fetch a page's HTML. Returns null for any non-HTML, non-OK, or failed response.
 *
 * Shared by metadata parsing, article extraction, and the health checker so that saving a link
 * costs one request rather than one per feature.
 */
export async function fetchPageHtml(
  url: string,
  timeoutMs = METADATA_FETCH_TIMEOUT_MS,
): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': FETCH_USER_AGENT,
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) return null;

    return {
      html: (await response.text()).slice(0, MAX_HTML_BYTES),
      finalUrl: response.url || url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Best-effort metadata derived from the URL alone, used when the page can't be fetched. */
export function fallbackMetadata(url: string): LinkMetadata {
  const host = extractHost(url);
  return {
    ...EMPTY,
    title: titleFromUrl(url),
    siteName: host,
    favicon: host ? faviconUrlForHost(host) : null,
  };
}

/** Merge parsed page metadata over the URL-derived fallback. */
export function mergeMetadata(parsed: LinkMetadata, fallback: LinkMetadata): LinkMetadata {
  return {
    title: parsed.title ?? fallback.title,
    description: parsed.description,
    image: parsed.image,
    favicon: parsed.favicon ?? fallback.favicon,
    siteName: parsed.siteName ?? fallback.siteName,
  };
}

/**
 * Fetch a URL and extract its metadata. Never throws: on any failure it returns a best-effort
 * result derived from the URL itself so the Add flow can still show a usable preview.
 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const fallback = fallbackMetadata(url);
  const page = await fetchPageHtml(url);
  if (!page) return fallback;
  return mergeMetadata(parseHtmlMetadata(page.html, page.finalUrl), fallback);
}
