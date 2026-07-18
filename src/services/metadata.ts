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

/** Decode the small set of HTML entities that commonly appear in titles/descriptions. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
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

/**
 * Fetch a URL and extract its metadata. Never throws: on any failure it returns a best-effort
 * result derived from the URL itself so the Add flow can still show a usable preview.
 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const host = extractHost(url);
  const fallback: LinkMetadata = {
    ...EMPTY,
    title: titleFromUrl(url),
    siteName: host,
    favicon: host ? faviconUrlForHost(host) : null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METADATA_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; LinkVault/1.0; +https://linkvault.app) AppleWebKit/537.36',
      },
    });
    if (!response.ok) return fallback;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) return fallback;

    // Cap parsing to the document head region to avoid processing huge pages.
    const html = (await response.text()).slice(0, 300_000);
    const parsed = parseHtmlMetadata(html, response.url || url);

    return {
      title: parsed.title ?? fallback.title,
      description: parsed.description,
      image: parsed.image,
      favicon: parsed.favicon ?? fallback.favicon,
      siteName: parsed.siteName ?? fallback.siteName,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
