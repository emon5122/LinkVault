/**
 * Background article extraction.
 *
 * Saving a link only captures its metadata; the body is fetched here and written to `links.content`
 * so it becomes searchable and readable offline. Runs in bounded batches for the same reason the
 * health sweep does — this is a phone, frequently on cellular.
 */
import { EXTRACTION_BATCH_SIZE, EXTRACTION_CONCURRENCY } from '@/constants/config';
import { linksRepository } from '@/database';
import type { ArticleUpdate, Link } from '@/types';

import { fetchArticle } from './readability';

/**
 * Fetch and store one link's article body.
 *
 * A page that yields no readable text still stamps `extractedAt`, which is what stops the sweep
 * from retrying the same unreadable URL forever. Returns the stored article, or null when the page
 * had nothing worth keeping.
 */
export async function extractForLink(link: Link): Promise<ArticleUpdate | null> {
  const article = await fetchArticle(link.url);

  const update: ArticleUpdate | null = article
    ? {
        content: article.content,
        excerpt: article.excerpt,
        byline: article.byline,
        wordCount: article.wordCount,
      }
    : null;

  await linksRepository.setArticle(link.id, update);
  return update;
}

/** Re-run extraction for a single link, ignoring whether it has been tried before. */
export async function reExtract(linkId: number): Promise<ArticleUpdate | null> {
  const link = await linksRepository.getById(linkId);
  if (!link) return null;
  return extractForLink(link);
}

async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        await worker(items[index]);
      }
    }),
  );
}

export interface ExtractionSweepResult {
  attempted: number;
  extracted: number;
}

/** Extract article bodies for the newest links that have never been tried. */
export async function runExtractionSweep(options?: {
  limit?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<ExtractionSweepResult> {
  const limit = options?.limit ?? EXTRACTION_BATCH_SIZE;
  const links = await linksRepository.listNeedingExtraction(limit);
  if (links.length === 0) return { attempted: 0, extracted: 0 };

  let done = 0;
  let extracted = 0;

  await pool(links, EXTRACTION_CONCURRENCY, async (link) => {
    const result = await extractForLink(link);
    if (result) extracted += 1;
    done += 1;
    options?.onProgress?.(done, links.length);
  });

  return { attempted: links.length, extracted };
}
