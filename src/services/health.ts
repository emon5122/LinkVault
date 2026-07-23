/**
 * Link health checking and Wayback Machine fallback.
 *
 * A bookmark manager stores a *pointer*, and pointers rot. This service periodically re-checks
 * saved links, records the outcome on the row, and — when a link is genuinely dead — looks up an
 * archived snapshot so the user still has something to read.
 *
 * Everything here is client-side: reachability is a plain `fetch`, and the Wayback endpoints are
 * public and keyless. No data about the user's library leaves the device beyond the URL being
 * checked, which the device would fetch anyway when opening the link.
 */
import {
  HEALTH_BATCH_SIZE,
  HEALTH_CHECK_TIMEOUT_MS,
  HEALTH_CONCURRENCY,
  HEALTH_STALE_MS,
  WAYBACK_AVAILABILITY_API,
  WAYBACK_SAVE_URL,
} from '@/constants/config';
import { linksRepository } from '@/database';
import type { HealthUpdate, Link, LinkStatus } from '@/types';
import { ensureProtocol, normalizeUrl } from '@/utils/url';

import { FETCH_USER_AGENT } from './metadata';

export interface CheckResult {
  status: LinkStatus;
  statusCode: number | null;
  finalUrl: string | null;
}

/**
 * Status codes that mean "the server refused *us*", not "the page is gone".
 *
 * Bot protection answers a non-browser client with 403/429 constantly. Treating those as broken
 * would fill the Broken list with perfectly healthy links, so they land in `unknown` instead — the
 * user sees "couldn't verify" rather than a false accusation.
 */
const INCONCLUSIVE_CODES = new Set([401, 403, 405, 406, 429, 451, 503]);

function classify(statusCode: number, requestedUrl: string, finalUrl: string): LinkStatus {
  if (statusCode >= 200 && statusCode < 300) {
    return normalizeUrl(finalUrl) === normalizeUrl(requestedUrl) ? 'ok' : 'redirected';
  }
  if (INCONCLUSIVE_CODES.has(statusCode)) return 'unknown';
  if (statusCode >= 400) return 'broken';
  return 'unknown';
}

async function request(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml,*/*', 'User-Agent': FETCH_USER_AGENT },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check whether a URL still resolves.
 *
 * Tries HEAD first because it avoids downloading the body, then retries with GET — a surprising
 * number of servers reject HEAD with 4xx/5xx while serving GET perfectly well, so a HEAD-only
 * checker reports phantom breakage.
 */
export async function checkUrl(rawUrl: string): Promise<CheckResult> {
  const url = ensureProtocol(rawUrl);
  try {
    let response = await request(url, 'HEAD');
    if (!response.ok && INCONCLUSIVE_CODES.has(response.status)) {
      response = await request(url, 'GET');
    }
    const finalUrl = response.url || url;
    return {
      status: classify(response.status, url, finalUrl),
      statusCode: response.status,
      finalUrl,
    };
  } catch {
    // Offline, DNS failure, TLS error, or timeout — indistinguishable from here, and none of them
    // prove the link is dead.
    return { status: 'unknown', statusCode: null, finalUrl: null };
  }
}

/**
 * Look up the most recent Wayback Machine snapshot for a URL.
 *
 * Returns null when no snapshot exists or the lookup fails; callers treat that as "no fallback
 * available" rather than an error worth surfacing.
 */
export async function findWaybackSnapshot(rawUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const endpoint = `${WAYBACK_AVAILABILITY_API}?url=${encodeURIComponent(ensureProtocol(rawUrl))}`;
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      archived_snapshots?: { closest?: { available?: boolean; url?: string } };
    };
    const closest = data?.archived_snapshots?.closest;
    if (!closest?.available || !closest.url) return null;
    // The API returns http:// snapshot URLs; upgrade so the in-app browser doesn't warn.
    return closest.url.replace(/^http:\/\//i, 'https://');
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ask the Wayback Machine to archive a URL now.
 *
 * Best-effort by design: the endpoint is heavily rate-limited and can take a minute to respond, so
 * this resolves as soon as the request is accepted and never reports failure as an error. Returns
 * true when the request went through, which only means "queued", not "archived".
 */
export async function requestWaybackSave(rawUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`${WAYBACK_SAVE_URL}/${ensureProtocol(rawUrl)}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': FETCH_USER_AGENT },
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check one link and persist the result.
 *
 * When the link is dead we also look for an archived copy — but only then, so a healthy library
 * never generates traffic to archive.org.
 */
export async function checkLink(link: Link): Promise<HealthUpdate> {
  const result = await checkUrl(link.url);

  const update: HealthUpdate = { status: result.status, statusCode: result.statusCode };
  if (result.status === 'broken' && !link.archiveUrl) {
    update.archiveUrl = await findWaybackSnapshot(link.url);
  }

  await linksRepository.setHealth(link.id, update);
  return update;
}

/** Run `worker` over `items` with at most `concurrency` in flight at a time. */
async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

export interface SweepResult {
  checked: number;
  broken: number;
  recovered: number;
}

/**
 * Check a batch of stale links.
 *
 * Bounded on purpose — this runs on a phone, often on cellular. One sweep covers `HEALTH_BATCH_SIZE`
 * links and the least-recently-checked come first, so repeated sweeps work through the whole
 * library without ever hammering it in one go.
 */
export async function runHealthSweep(options?: {
  limit?: number;
  staleMs?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<SweepResult> {
  const limit = options?.limit ?? HEALTH_BATCH_SIZE;
  const staleMs = options?.staleMs ?? HEALTH_STALE_MS;

  const links = await linksRepository.listNeedingHealthCheck(limit, staleMs);
  if (links.length === 0) return { checked: 0, broken: 0, recovered: 0 };

  let done = 0;
  const updates = await pool(links, HEALTH_CONCURRENCY, async (link) => {
    const update = await checkLink(link);
    done += 1;
    options?.onProgress?.(done, links.length);
    return update;
  });

  return {
    checked: updates.length,
    broken: updates.filter((u) => u.status === 'broken').length,
    recovered: updates.filter((u) => u.archiveUrl).length,
  };
}

/**
 * The URL to actually open for a link: the original, or its archived snapshot when the original is
 * known to be dead. Keeps the "open" affordance working instead of sending the user to a 404.
 */
export function bestOpenUrl(link: Pick<Link, 'url' | 'status' | 'archiveUrl'>): string {
  return link.status === 'broken' && link.archiveUrl ? link.archiveUrl : link.url;
}
