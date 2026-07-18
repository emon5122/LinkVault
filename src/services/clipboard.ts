/** Clipboard URL detection for the "Save copied link?" suggestion. */
import * as Clipboard from 'expo-clipboard';

import { ensureProtocol, isValidUrl } from '@/utils/url';

/**
 * Read the clipboard and, if it holds a single URL (optionally without a scheme), return the
 * normalized URL string. Returns null when the clipboard is empty or not a link.
 */
export async function getClipboardUrl(): Promise<string | null> {
  let content: string;
  try {
    content = (await Clipboard.getStringAsync()).trim();
  } catch {
    return null;
  }
  if (!content || content.length > 2048 || /\s/.test(content)) return null;

  const candidate = ensureProtocol(content);
  return isValidUrl(candidate) ? candidate : null;
}

export async function setClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
