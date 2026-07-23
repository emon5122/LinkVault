/**
 * Folder sharing — send a collection to anyone, with no backend.
 *
 * Three tiers, deliberately ordered by reach rather than fidelity:
 *
 * 1. **Text** (`folderToShareText`) goes through the OS share sheet into WhatsApp, Signal, email —
 *    anything. A recipient without LinkVault still gets a readable list, which is the point.
 * 2. **File** (`folderToBundle`) is a `.linkvault` JSON document that preserves notes, tags, and
 *    folder styling. Messaging apps send it as an attachment.
 * 3. **QR** (`folderToQrPayload`) transfers a small folder device-to-device with no network at all.
 *
 * The receiving side never needs to know which tier was used: shared text is parsed by
 * `parseTextLinks`, and both the file and QR payloads are the same JSON shape.
 */
import {
  FOLDER_SHARE_EXTENSION,
  FOLDER_SHARE_MIME,
  FOLDER_SHARE_VERSION,
  QR_PAYLOAD_MAX_BYTES,
} from '@/constants/config';
import { foldersRepository, linksRepository, relationsRepository } from '@/database';
import type { Folder, Link } from '@/types';

import { fileTimestamp, shareFile, writeCacheFile } from './files';
import type { ParsedLink } from './import-export';

/** A folder plus its links, as written to a `.linkvault` file or a QR code. */
export interface FolderBundle {
  app: 'LinkVault';
  type: 'folder-share';
  version: number;
  folder: { name: string; icon?: string; color?: string };
  links: {
    url: string;
    title?: string;
    description?: string | null;
    notes?: string | null;
    tags?: string[];
  }[];
}

// ---------------------------------------------------------------------------
// Tier 1 — human-readable text
// ---------------------------------------------------------------------------

/**
 * Render a folder as a plain-text list.
 *
 * Numbered title-then-URL lines are what `parseTextLinks` reads back most reliably, and they happen
 * to be exactly how a person would write the list by hand — so the format is simultaneously the
 * wire protocol and the human-facing message.
 */
export function folderToShareText(folder: Pick<Folder, 'name'>, links: Link[]): string {
  const lines: string[] = [
    `📁 ${folder.name} · ${links.length} ${links.length === 1 ? 'link' : 'links'}`,
    '',
  ];

  links.forEach((link, index) => {
    const title = (link.title || link.url).replace(/\s+/g, ' ').trim();
    lines.push(`${index + 1}. ${title}`);
    lines.push(`   ${link.url}`);
  });

  lines.push('', 'Shared from LinkVault');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tier 2/3 — structured bundle
// ---------------------------------------------------------------------------

export function buildFolderBundle(
  folder: Folder,
  links: Link[],
  tagMap?: Map<number, string[]>,
): FolderBundle {
  return {
    app: 'LinkVault',
    type: 'folder-share',
    version: FOLDER_SHARE_VERSION,
    folder: { name: folder.name, icon: folder.icon, color: folder.color },
    links: links.map((link) => ({
      url: link.url,
      title: link.title || undefined,
      description: link.description,
      notes: link.notes,
      tags: tagMap?.get(link.id) ?? [],
    })),
  };
}

/** Validate and type an incoming bundle. Returns null when the payload isn't one of ours. */
export function parseFolderBundle(text: string): FolderBundle | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const obj = data as Partial<FolderBundle> | null;
  if (!obj || obj.app !== 'LinkVault' || obj.type !== 'folder-share') return null;
  if (!obj.folder?.name || !Array.isArray(obj.links)) return null;

  return {
    app: 'LinkVault',
    type: 'folder-share',
    version: typeof obj.version === 'number' ? obj.version : 1,
    folder: {
      name: String(obj.folder.name),
      icon: obj.folder.icon ? String(obj.folder.icon) : undefined,
      color: obj.folder.color ? String(obj.folder.color) : undefined,
    },
    links: obj.links
      .filter((l): l is FolderBundle['links'][number] => Boolean(l?.url))
      .map((l) => ({
        url: String(l.url),
        title: l.title ? String(l.title) : undefined,
        description: l.description ?? null,
        notes: l.notes ?? null,
        tags: Array.isArray(l.tags) ? l.tags.map(String) : [],
      })),
  };
}

/** Convert a bundle into the shape `persistParsedLinks` consumes. */
export function bundleToParsedLinks(bundle: FolderBundle): ParsedLink[] {
  return bundle.links.map((link) => ({
    url: link.url,
    title: link.title,
    description: link.description ?? null,
    notes: link.notes ?? null,
    tags: link.tags ?? [],
    folders: [bundle.folder.name],
  }));
}

// ---------------------------------------------------------------------------
// QR payload
// ---------------------------------------------------------------------------

export interface QrPayloadResult {
  payload: string;
  /** How many links fit inside the QR size limit. */
  included: number;
  /** How many were dropped to make it scannable. */
  omitted: number;
}

/**
 * UTF-8 byte length of a string.
 *
 * QR capacity is measured in bytes, not characters, so a folder full of non-Latin titles takes far
 * more room than its `.length` suggests. Computed by hand rather than via `TextEncoder`, which is
 * not guaranteed to exist on Hermes.
 */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.codePointAt(i) as number;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else {
      bytes += 4;
      i += 1; // surrogate pair — skip the low half
    }
  }
  return bytes;
}

/**
 * Build the smallest useful bundle that still fits in a scannable QR code.
 *
 * Titles are kept only while there is room; past that the payload degrades to bare URLs, and past
 * *that* links are dropped from the end. The caller is told how many were omitted so the UI can say
 * so out loud rather than silently sharing a truncated folder.
 */
export function folderToQrPayload(
  folder: Folder,
  links: Link[],
  maxBytes = QR_PAYLOAD_MAX_BYTES,
): QrPayloadResult {
  const compact = (subset: Link[], withTitles: boolean): string =>
    JSON.stringify({
      app: 'LinkVault',
      type: 'folder-share',
      version: FOLDER_SHARE_VERSION,
      folder: { name: folder.name },
      links: subset.map((l) =>
        withTitles && l.title ? { url: l.url, title: l.title } : { url: l.url },
      ),
    });

  for (const withTitles of [true, false]) {
    const full = compact(links, withTitles);
    if (utf8ByteLength(full) <= maxBytes) {
      return { payload: full, included: links.length, omitted: 0 };
    }
  }

  // Still too large with titles stripped — binary search the number of links that fits.
  let low = 0;
  let high = links.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (utf8ByteLength(compact(links.slice(0, mid), false)) <= maxBytes) low = mid;
    else high = mid - 1;
  }

  return {
    payload: compact(links.slice(0, low), false),
    included: low,
    omitted: links.length - low,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function loadFolder(folderId: number): Promise<{ folder: Folder; links: Link[] }> {
  const [folder, links] = await Promise.all([
    foldersRepository.getById(folderId),
    linksRepository.listByFolder(folderId),
  ]);
  if (!folder) throw new Error('Folder not found');
  return { folder, links };
}

/** Share a folder as plain text through the OS share sheet. */
export async function shareFolderAsText(folderId: number): Promise<{ count: number; text: string }> {
  const { folder, links } = await loadFolder(folderId);
  const text = folderToShareText(folder, links);
  return { count: links.length, text };
}

/** Write a folder to a `.linkvault` file and hand it to the OS share sheet. */
export async function shareFolderAsFile(
  folderId: number,
): Promise<{ uri: string; count: number; shared: boolean }> {
  const { folder, links } = await loadFolder(folderId);
  const tagMap = await relationsRepository.tagNamesByLink();
  const bundle = buildFolderBundle(folder, links, tagMap);

  const safeName = folder.name.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'folder';
  const uri = writeCacheFile(
    `${safeName}-${fileTimestamp()}.${FOLDER_SHARE_EXTENSION}`,
    JSON.stringify(bundle, null, 2),
  );
  const shared = await shareFile(uri, {
    mimeType: FOLDER_SHARE_MIME,
    dialogTitle: `Share "${folder.name}"`,
  });
  return { uri, count: links.length, shared };
}

/** Build the QR payload for a folder. */
export async function buildFolderQr(folderId: number): Promise<QrPayloadResult & { folder: Folder }> {
  const { folder, links } = await loadFolder(folderId);
  return { ...folderToQrPayload(folder, links), folder };
}
