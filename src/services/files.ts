/**
 * File I/O helpers built on the SDK 57 object-oriented FileSystem API.
 *
 * Exports are written into the cache directory (safe to be cleared) and handed to the OS share
 * sheet. Picked documents are read with the legacy API, which reliably handles the `content://`
 * and cached `file://` URIs the document picker returns on Android.
 */
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** Write UTF-8 text into the cache directory and return the file URI. */
export function writeCacheFile(fileName: string, content: string): string {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file.uri;
}

/** Read text from an arbitrary (picked) file URI. */
export async function readFileText(uri: string): Promise<string> {
  return readAsStringAsync(uri);
}

/** Share a file via the OS share sheet. Returns false when sharing is unavailable. */
export async function shareFile(
  uri: string,
  options?: { mimeType?: string; dialogTitle?: string },
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: options?.mimeType,
    dialogTitle: options?.dialogTitle,
  });
  return true;
}

/** Timestamp fragment (YYYY-MM-DD-HHmm) for export/backup file names. */
export function fileTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}
