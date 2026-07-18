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
import { isValidUrl, tryParseUrl } from '@/utils/url';

export type IncomingIntent =
  | { type: 'add'; url: string }
  | { type: 'openLink'; id: number }
  | null;

/** Pull the first http(s) URL out of arbitrary shared text (for ACTION_SEND payloads). */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match && isValidUrl(match[0]) ? match[0] : null;
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
  const segments = [url.hostname, ...url.pathname.split('/')].filter(Boolean);
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
