/**
 * Import and export of links.
 *
 * Import supports CSV, JSON (LinkVault's own or a generic array), and Netscape HTML bookmark files
 * (the format Chrome/Firefox/Safari/Edge export). Export supports CSV, JSON, and Markdown.
 * Parsers are pure (`parseCsvLinks` / `parseJsonLinks` / `parseHtmlBookmarks`) and unit-tested; the
 * persistence + file plumbing lives in `importLinks` / `exportLinks`.
 */
import * as DocumentPicker from 'expo-document-picker';

import { foldersRepository, linksRepository, relationsRepository, tagsRepository } from '@/database';
import type { Link, NewLinkInput } from '@/types';
import { parseCsvRecords, toCsv } from '@/utils/csv';
import { escapeMarkdown } from '@/utils/markdown';
import { isValidUrl } from '@/utils/url';

import { fileTimestamp, readFileText, shareFile, writeCacheFile } from './files';

export type ImportFormat = 'csv' | 'json' | 'html';
export type ExportFormat = 'csv' | 'json' | 'markdown';

/** A link parsed out of an import file, before folders/tags are resolved to ids. */
export interface ParsedLink {
  url: string;
  title?: string;
  description?: string | null;
  notes?: string | null;
  tags: string[];
  folders: string[];
  favorite?: boolean;
  readLater?: boolean;
  archived?: boolean;
  pinned?: boolean;
  createdAt?: number;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  total: number;
}

const truthy = (value: string | undefined): boolean =>
  value != null && ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[;,|]/)
    .map((v) => v.trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// Parsers (pure)
// ---------------------------------------------------------------------------

/** Parse a CSV file. The first row is treated as a header; only `url` is required. */
export function parseCsvLinks(text: string): ParsedLink[] {
  const records = parseCsvRecords(text);
  const links: ParsedLink[] = [];
  for (const r of records) {
    const url = (r.url || r.href || r.link || r.address || '').trim();
    if (!isValidUrl(url)) continue;
    links.push({
      url,
      title: (r.title || r.name || '').trim() || undefined,
      description: r.description || r.excerpt || null,
      notes: r.notes || r.note || null,
      tags: splitList(r.tags || r.labels),
      folders: splitList(r.folder || r.folders || r.category),
      favorite: truthy(r.favorite),
      readLater: truthy(r.readlater ?? r['read later']),
      archived: truthy(r.archived),
      pinned: truthy(r.pinned),
    });
  }
  return links;
}

/** Parse a JSON file — either a bare array or an object with a `links` array. */
export function parseJsonLinks(text: string): ParsedLink[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const rows: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { links?: unknown[] })?.links)
      ? (data as { links: unknown[] }).links
      : [];

  const links: ParsedLink[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const url = String(o.url ?? o.href ?? o.link ?? '').trim();
    if (!isValidUrl(url)) continue;
    const tags = Array.isArray(o.tags)
      ? o.tags.map((t) => String(t))
      : splitList(typeof o.tags === 'string' ? o.tags : undefined);
    const folders = Array.isArray(o.folders)
      ? o.folders.map((f) => String(f))
      : splitList(typeof o.folder === 'string' ? o.folder : undefined);
    links.push({
      url,
      title: typeof o.title === 'string' ? o.title : undefined,
      description: typeof o.description === 'string' ? o.description : null,
      notes: typeof o.notes === 'string' ? o.notes : null,
      tags,
      folders,
      favorite: Boolean(o.favorite),
      readLater: Boolean(o.readLater),
      archived: Boolean(o.archived),
      pinned: Boolean(o.pinned),
      createdAt: typeof o.createdAt === 'number' ? o.createdAt : undefined,
    });
  }
  return links;
}

/**
 * Parse a Netscape bookmark HTML file. Anchors are collected in document order; each is assigned
 * the most recent `<H3>` heading as its folder, which matches how browsers nest bookmark folders.
 */
export function parseHtmlBookmarks(html: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const tokenRe = /<h3[^>]*>([\s\S]*?)<\/h3>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let currentFolder = '';
  let match: RegExpExecArray | null;

  const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  while ((match = tokenRe.exec(html)) !== null) {
    if (match[1] !== undefined) {
      currentFolder = stripTags(match[1]);
      continue;
    }
    const attrs = match[2] ?? '';
    const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrs);
    const url = hrefMatch?.[1]?.trim();
    if (!url || !isValidUrl(url)) continue;

    const tagsAttr = /tags\s*=\s*"([^"]*)"/i.exec(attrs)?.[1];
    const addDate = /add_date\s*=\s*"(\d+)"/i.exec(attrs)?.[1];
    links.push({
      url,
      title: stripTags(match[3] ?? '') || undefined,
      description: null,
      notes: null,
      tags: splitList(tagsAttr),
      folders: currentFolder ? [currentFolder] : [],
      createdAt: addDate ? Number(addDate) * 1000 : undefined,
    });
  }
  return links;
}

function parseByFormat(text: string, format: ImportFormat): ParsedLink[] {
  switch (format) {
    case 'csv':
      return parseCsvLinks(text);
    case 'json':
      return parseJsonLinks(text);
    case 'html':
      return parseHtmlBookmarks(text);
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Resolve folder/tag names to ids (creating as needed) and bulk-insert, skipping duplicates. */
export async function persistParsedLinks(parsed: ParsedLink[]): Promise<ImportResult> {
  const folderIdByName = new Map<string, number>();
  const tagIdByName = new Map<string, number>();

  const uniqueFolders = new Set(parsed.flatMap((p) => p.folders));
  const uniqueTags = new Set(parsed.flatMap((p) => p.tags));

  for (const name of uniqueFolders) {
    const folder = await foldersRepository.getOrCreateByName(name);
    folderIdByName.set(name, folder.id);
  }
  for (const name of uniqueTags) {
    try {
      const tag = await tagsRepository.getOrCreate(name);
      tagIdByName.set(name, tag.id);
    } catch {
      /* invalid tag name — ignore */
    }
  }

  const inputs: NewLinkInput[] = parsed.map((p) => ({
    url: p.url,
    title: p.title,
    description: p.description ?? null,
    notes: p.notes ?? null,
    favorite: p.favorite,
    readLater: p.readLater,
    archived: p.archived,
    pinned: p.pinned,
    folderIds: p.folders.map((n) => folderIdByName.get(n)).filter((id): id is number => id != null),
    tagIds: p.tags.map((n) => tagIdByName.get(n)).filter((id): id is number => id != null),
  }));

  const { inserted, skipped } = await linksRepository.bulkInsert(inputs);
  return { inserted, skipped, total: parsed.length };
}

/** Full import flow: prompt for a file, read it, parse, and persist. Returns null if cancelled. */
export async function importLinks(format: ImportFormat): Promise<ImportResult | null> {
  const mimeByFormat: Record<ImportFormat, string[]> = {
    csv: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
    json: ['application/json', 'text/plain', '*/*'],
    html: ['text/html', '*/*'],
  };

  const result = await DocumentPicker.getDocumentAsync({
    type: mimeByFormat[format],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const text = await readFileText(result.assets[0].uri);
  const parsed = parseByFormat(text, format);
  return persistParsedLinks(parsed);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const CSV_HEADER = [
  'url',
  'title',
  'description',
  'notes',
  'siteName',
  'host',
  'tags',
  'folders',
  'favorite',
  'readLater',
  'archived',
  'pinned',
  'visitCount',
  'createdAt',
];

export function linksToCsv(
  links: Link[],
  tagMap: Map<number, string[]>,
  folderMap: Map<number, string[]>,
): string {
  const rows = links.map((l) => [
    l.url,
    l.title,
    l.description ?? '',
    l.notes ?? '',
    l.siteName ?? '',
    l.host ?? '',
    (tagMap.get(l.id) ?? []).join('; '),
    (folderMap.get(l.id) ?? []).join('; '),
    l.favorite ? 'true' : 'false',
    l.readLater ? 'true' : 'false',
    l.archived ? 'true' : 'false',
    l.pinned ? 'true' : 'false',
    l.visitCount,
    new Date(l.createdAt).toISOString(),
  ]);
  return toCsv([CSV_HEADER, ...rows]);
}

export function linksToJson(
  links: Link[],
  tagMap: Map<number, string[]>,
  folderMap: Map<number, string[]>,
  exportedAt = Date.now(),
): string {
  return JSON.stringify(
    {
      app: 'LinkVault',
      type: 'links-export',
      exportedAt,
      count: links.length,
      links: links.map((l) => ({
        ...l,
        tags: tagMap.get(l.id) ?? [],
        folders: folderMap.get(l.id) ?? [],
      })),
    },
    null,
    2,
  );
}

export function linksToMarkdown(
  links: Link[],
  tagMap: Map<number, string[]>,
  exportedAt = Date.now(),
): string {
  const lines: string[] = ['# LinkVault Export', '', `_${links.length} links · ${new Date(exportedAt).toISOString().slice(0, 10)}_`, ''];
  for (const l of links) {
    const title = escapeMarkdown(l.title || l.url).replace(/\n/g, ' ');
    lines.push(`- [${title}](${l.url})`);
    if (l.description) lines.push(`  - ${escapeMarkdown(l.description.replace(/\s+/g, ' '))}`);
    const tags = tagMap.get(l.id) ?? [];
    if (tags.length) lines.push(`  - ${tags.map((t) => `#${t.replace(/\s+/g, '-')}`).join(' ')}`);
  }
  return lines.join('\n');
}

/** Build the export content, write it to a cache file, and open the OS share sheet. */
export async function exportLinks(
  format: ExportFormat,
): Promise<{ uri: string; count: number; shared: boolean }> {
  const [links, tagMap, folderMap] = await Promise.all([
    linksRepository.getAll(),
    relationsRepository.tagNamesByLink(),
    relationsRepository.folderNamesByLink(),
  ]);

  const config: Record<ExportFormat, { ext: string; mime: string; build: () => string }> = {
    csv: { ext: 'csv', mime: 'text/csv', build: () => linksToCsv(links, tagMap, folderMap) },
    json: {
      ext: 'json',
      mime: 'application/json',
      build: () => linksToJson(links, tagMap, folderMap),
    },
    markdown: {
      ext: 'md',
      mime: 'text/markdown',
      build: () => linksToMarkdown(links, tagMap),
    },
  };

  const { ext, mime, build } = config[format];
  const uri = writeCacheFile(`linkvault-export-${fileTimestamp()}.${ext}`, build());
  const shared = await shareFile(uri, { mimeType: mime, dialogTitle: 'Export LinkVault links' });
  return { uri, count: links.length, shared };
}
