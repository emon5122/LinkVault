/**
 * Deep link + shared-URL handling.
 *
 * Fully supported today: custom-scheme and app-link URLs (`linkvault://add?url=…`,
 * `https://linkvault.app/add?url=…`, `linkvault://link/42`) via expo-linking.
 *
 * Platform limitation: Android's ACTION_SEND (the system "Share" sheet handing plain text to the
 * app) is NOT delivered through expo-linking — Expo core exposes no API for the SEND intent's
 * extras. The app.json intent filter makes LinkVault appear as a share target; to actually receive
 * that text you must add the `expo-share-intent` config plugin (a dev-build native module) and feed
 * its payload into `extractFirstUrl` below. Until then, clipboard detection + deep links are the
 * fully-working save-from-anywhere paths.
 */
import { APP_LINK_HOST } from '@/constants/config';
import { isValidUrl, normalizeUrl, tryParseUrl } from '@/utils/url';

export type IncomingIntent =
  | { type: 'add'; url: string }
  | { type: 'openLink'; id: number }
  | null;

/**
 * Trailing characters that are almost never part of a URL but frequently follow one in prose —
 * sentence punctuation, and closing brackets from Markdown/parenthetical wrapping.
 */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"»›]+$/;

const URL_RE = /https?:\/\/[^\s"'<>()[\]]+/gi;

/** Strip prose punctuation that a naive URL match swallowed. */
function trimUrl(candidate: string): string {
  return candidate.replace(TRAILING_PUNCTUATION, '');
}

/** Pull the first http(s) URL out of arbitrary shared text (for ACTION_SEND payloads). */
export function extractFirstUrl(text: string): string | null {
  return extractAllUrls(text)[0] ?? null;
}

/**
 * Pull every distinct http(s) URL out of arbitrary text, in order.
 *
 * This is what turns a pasted or shared *list* into something importable — a WhatsApp message, a
 * Notion page, an email. Duplicates collapse on canonical form so the same link written two ways
 * ("example.com/a" and "example.com/a?utm_source=x") only lands once.
 */
export function extractAllUrls(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(URL_RE)) {
    const url = trimUrl(match[0]);
    if (!isValidUrl(url)) continue;
    const key = normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/** Interpret an incoming deep link into an app intent, or null if it isn't actionable. */
export function parseIncomingUrl(incoming: string): IncomingIntent {
  const url = tryParseUrl(incoming);
  if (!url) return null;

  const isAppLink =
    url.protocol === 'linkvault:' ||
    ((url.protocol === 'https:' || url.protocol === 'http:') && url.hostname === APP_LINK_HOST);
  if (!isAppLink) {
    // A bare shared web URL — treat the whole thing as something to add.
    return isValidUrl(incoming) ? { type: 'add', url: incoming } : null;
  }

  // Normalize `linkvault://add` (host=add) and `https://linkvault.app/add` (path=/add).
  //
  // The two forms put the action in different places: under the custom scheme the "host" IS the
  // action, while under https the host is the domain and the action is the first path segment.
  // Treating the https host as a segment would make the action "linkvault.app" and match nothing.
  const segments = [
    ...(url.protocol === 'linkvault:' ? [url.hostname] : []),
    ...url.pathname.split('/'),
  ].filter(Boolean);
  const action = segments[0];

  if (action === 'add') {
    const shared = url.searchParams.get('url') ?? url.searchParams.get('text');
    if (shared && isValidUrl(shared)) return { type: 'add', url: shared };
    return { type: 'add', url: '' };
  }

  if (action === 'link') {
    const id = Number(segments[1]);
    return Number.isFinite(id) && id > 0 ? { type: 'openLink', id } : null;
  }

  return null;
}
