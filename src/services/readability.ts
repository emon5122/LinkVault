/**
 * Article extraction — turns a fetched HTML page into readable text the app owns.
 *
 * React Native has no DOM, so this works the same way `metadata.ts` does: targeted regexes over raw
 * HTML rather than a parser. `extractArticle` is pure and unit-tested; `fetchArticle` wraps it with
 * the shared page fetch.
 *
 * ## Storage format
 *
 * Extracted content is stored in `links.content` as one block per line, using Markdown-style
 * prefixes so the text stays human-readable in exports and indexes cleanly in FTS5 (the tokenizer
 * discards the punctuation):
 *
 * ```
 * # Heading
 * ## Subheading
 * Ordinary paragraph text.
 * - List item
 * > Block quote
 *     code line (four-space indent)
 * ```
 *
 * A paragraph whose own text happens to begin with one of those markers is prefixed with a
 * zero-width space at write time so it round-trips as a paragraph; `parseArticle` strips it. That
 * character is a token separator for `unicode61`, so it never reaches the search index.
 */
import { METADATA_FETCH_TIMEOUT_MS } from '@/constants/config';

import {
  decodeEntities,
  fallbackMetadata,
  fetchPageHtml,
  mergeMetadata,
  parseHtmlMetadata,
  type LinkMetadata,
} from './metadata';

/** Zero-width space used to escape a paragraph that would otherwise parse as a marked block. */
const ESCAPE = '​';

/** Average adult reading speed, used for the "N min read" estimate. */
const WORDS_PER_MINUTE = 220;

/** Below this much text, the page is navigation/boilerplate rather than an article. */
const MIN_ARTICLE_CHARS = 200;

export type ArticleBlockKind = 'heading' | 'subheading' | 'paragraph' | 'listItem' | 'quote' | 'code';

export interface ArticleBlock {
  kind: ArticleBlockKind;
  text: string;
}

export interface Article {
  /** Serialized blocks, ready to store in `links.content`. */
  content: string;
  blocks: ArticleBlock[];
  excerpt: string;
  byline: string | null;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// HTML → text helpers
// ---------------------------------------------------------------------------

/** Elements whose contents are never article text. Removed wholesale, including children. */
const NOISE_TAGS = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'iframe',
  'form',
  'nav',
  'aside',
  'header',
  'footer',
  'figcaption',
];

function stripNoise(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of NOISE_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
    // Unclosed noise elements (common with malformed <script>) would otherwise swallow the page.
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), ' ');
  }
  return out;
}

/**
 * Return the inner HTML of the first `<tag>`, tracking nesting so an outer `<article>` containing an
 * inner one isn't truncated at the wrong closing tag. Returns null when the tag isn't present.
 */
export function extractBalanced(html: string, tagName: string): string | null {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, 'i').exec(html);
  if (!open) return null;

  const start = open.index + open[0].length;
  const scan = new RegExp(`<(\\/?)${tagName}\\b[^>]*>`, 'gi');
  scan.lastIndex = start;

  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = scan.exec(html)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  // Unclosed tag — treat the remainder of the document as its contents.
  return html.slice(start);
}

/** Flatten an HTML fragment to a single line of plain text. */
function htmlToText(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same, but keeps line breaks — used for `<pre>` where layout is meaningful. */
function htmlToLines(fragment: string): string[] {
  return decodeEntities(fragment.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line) => line.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const BLOCK_RE = /<(p|h1|h2|h3|h4|h5|h6|li|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi;

function kindForTag(tag: string): ArticleBlockKind {
  const lower = tag.toLowerCase();
  if (lower === 'h1' || lower === 'h2') return 'heading';
  if (lower === 'h3' || lower === 'h4' || lower === 'h5' || lower === 'h6') return 'subheading';
  if (lower === 'li') return 'listItem';
  if (lower === 'blockquote') return 'quote';
  if (lower === 'pre') return 'code';
  return 'paragraph';
}

/** Narrow the document to its article body, preferring semantic containers over the full page. */
function findArticleRegion(html: string): string {
  for (const tag of ['article', 'main']) {
    const region = extractBalanced(html, tag);
    if (region && region.length > 200) return region;
  }
  const roleMain = /<(\w+)\b[^>]*role\s*=\s*["']main["'][^>]*>/i.exec(html);
  if (roleMain) {
    const region = extractBalanced(html.slice(roleMain.index), roleMain[1]);
    if (region && region.length > 200) return region;
  }
  return extractBalanced(html, 'body') ?? html;
}

function findByline(html: string): string | null {
  const meta = /<meta\b[^>]*name\s*=\s*["']author["'][^>]*content\s*=\s*["']([^"']+)["']/i.exec(html);
  if (meta) return decodeEntities(meta[1]).trim() || null;

  const reversed = /<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']author["']/i.exec(
    html,
  );
  if (reversed) return decodeEntities(reversed[1]).trim() || null;

  const rel = /<[^>]*rel\s*=\s*["']author["'][^>]*>([\s\S]{1,120}?)<\//i.exec(html);
  if (rel) {
    const text = htmlToText(rel[1]);
    if (text) return text;
  }
  return null;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Minutes of reading time for a word count, rounded up and floored at 1. */
export function readingMinutes(wordCount: number | null | undefined): number {
  if (!wordCount || wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

const MARKER_RE = /^(#{1,2}\s|-\s|>\s|\s{4})/;

/** Serialize blocks to the stored line format. */
export function serializeBlocks(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case 'heading':
          return `# ${block.text}`;
        case 'subheading':
          return `## ${block.text}`;
        case 'listItem':
          return `- ${block.text}`;
        case 'quote':
          return `> ${block.text}`;
        case 'code':
          return `    ${block.text}`;
        case 'paragraph':
          return MARKER_RE.test(block.text) ? `${ESCAPE}${block.text}` : block.text;
      }
    })
    .join('\n');
}

/** Parse stored content back into blocks. Inverse of `serializeBlocks`. */
export function parseArticle(content: string | null | undefined): ArticleBlock[] {
  if (!content) return [];
  const blocks: ArticleBlock[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith(ESCAPE)) {
      blocks.push({ kind: 'paragraph', text: line.slice(ESCAPE.length) });
    } else if (line.startsWith('## ')) {
      blocks.push({ kind: 'subheading', text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ kind: 'heading', text: line.slice(2) });
    } else if (line.startsWith('- ')) {
      blocks.push({ kind: 'listItem', text: line.slice(2) });
    } else if (line.startsWith('> ')) {
      blocks.push({ kind: 'quote', text: line.slice(2) });
    } else if (line.startsWith('    ')) {
      blocks.push({ kind: 'code', text: line.slice(4) });
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }
  return blocks;
}

/** Build a short plain-text summary from the first substantial paragraph. */
function buildExcerpt(blocks: ArticleBlock[], limit = 240): string {
  const first = blocks.find((b) => b.kind === 'paragraph' && b.text.length > 60) ?? blocks[0];
  const text = first?.text ?? '';
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

/**
 * Extract the readable article from a raw HTML page.
 *
 * Returns null when the page yields too little text to be worth storing — a search page, a login
 * wall, or a JS-rendered shell. Callers treat null as "not readable offline" rather than an error.
 */
export function extractArticle(html: string): Article | null {
  if (!html) return null;

  const byline = findByline(html);
  const region = findArticleRegion(stripNoise(html));

  const blocks: ArticleBlock[] = [];
  let match: RegExpExecArray | null;
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(region)) !== null) {
    const kind = kindForTag(match[1]);
    const inner = match[2];

    if (kind === 'code') {
      for (const line of htmlToLines(inner)) blocks.push({ kind, text: line });
      continue;
    }

    const text = htmlToText(inner);
    if (!text) continue;
    // Single-word paragraphs are almost always UI chrome that survived noise stripping
    // ("Share", "Menu"). Headings are kept regardless — they're short by nature.
    if (kind === 'paragraph' && countWords(text) < 3) continue;

    const previous = blocks[blocks.length - 1];
    if (previous && previous.kind === kind && previous.text === text) continue;

    blocks.push({ kind, text });
  }

  if (blocks.length === 0) return null;

  const plainLength = blocks.reduce((sum, b) => sum + b.text.length, 0);
  if (plainLength < MIN_ARTICLE_CHARS) return null;

  const wordCount = blocks.reduce((sum, b) => sum + countWords(b.text), 0);

  return {
    content: serializeBlocks(blocks),
    blocks,
    excerpt: buildExcerpt(blocks),
    byline,
    wordCount,
  };
}

/**
 * Fetch a URL and extract its article. Never throws — a network failure or an unreadable page both
 * resolve to null so the caller can just skip storing content.
 */
export async function fetchArticle(url: string): Promise<Article | null> {
  const page = await fetchPageHtml(url, METADATA_FETCH_TIMEOUT_MS);
  return page ? extractArticle(page.html) : null;
}

/**
 * Fetch a page once and derive both its metadata and its article body.
 *
 * Saving a link needs both, and they come from the same HTML — doing this in one request halves the
 * network cost and avoids showing the user a preview built from a different response than the
 * archived text.
 */
export async function fetchMetadataAndArticle(
  url: string,
): Promise<{ metadata: LinkMetadata; article: Article | null }> {
  const fallback = fallbackMetadata(url);
  const page = await fetchPageHtml(url);
  if (!page) return { metadata: fallback, article: null };

  return {
    metadata: mergeMetadata(parseHtmlMetadata(page.html, page.finalUrl), fallback),
    article: extractArticle(page.html),
  };
}
