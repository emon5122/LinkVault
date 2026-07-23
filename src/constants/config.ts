/** App-wide constants and defaults. */

export const APP_NAME = 'LinkVault';
export const APP_TAGLINE = 'Save everything. Find anything.';

/** SQLite database file name (lives in the app's document directory). */
export const DATABASE_NAME = 'linkvault.db';

/** Deep-link / custom scheme used for share + app-link handling. */
export const APP_SCHEME = 'linkvault';
export const APP_LINK_HOST = 'linkvault.app';

/** Page size used by the infinite link lists. */
export const PAGE_SIZE = 30;

/** Debounce (ms) applied to the search input before hitting the database. */
export const SEARCH_DEBOUNCE_MS = 200;

/** How long the paste-to-save suggestion stays dismissed for the same URL. */
export const CLIPBOARD_SUGGESTION_TTL_MS = 1000 * 60 * 30;

/** Timeout for the Open Graph metadata fetch. */
export const METADATA_FETCH_TIMEOUT_MS = 8000;

/**
 * Backup format version, bumped when the export schema changes.
 *
 * v2 added the article archive and link-health columns. Restore still accepts v1 files — the new
 * fields simply come back empty.
 */
export const BACKUP_FORMAT_VERSION = 2;

/** Timeout for a single link reachability check. Shorter than metadata: we only need the status. */
export const HEALTH_CHECK_TIMEOUT_MS = 10_000;

/** How long a health check stays fresh before the sweep re-checks that link. */
export const HEALTH_STALE_MS = 1000 * 60 * 60 * 24 * 14;

/** Links checked per sweep, and how many requests run at once. */
export const HEALTH_BATCH_SIZE = 25;
export const HEALTH_CONCURRENCY = 4;

/** Articles extracted per background pass. */
export const EXTRACTION_BATCH_SIZE = 10;
export const EXTRACTION_CONCURRENCY = 3;

/** Wayback Machine endpoints. Both are public and need no API key. */
export const WAYBACK_AVAILABILITY_API = 'https://archive.org/wayback/available';
export const WAYBACK_SAVE_URL = 'https://web.archive.org/save';

/** Words per minute assumed by the reading-time estimate. */
export const READING_WORDS_PER_MINUTE = 220;

/** Highlight colors offered in the reader. */
export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;

/** File extension + MIME type for a shared folder bundle. */
export const FOLDER_SHARE_EXTENSION = 'linkvault';
export const FOLDER_SHARE_MIME = 'application/json';

/** Format version for the shared-folder payload (file and QR). */
export const FOLDER_SHARE_VERSION = 1;

/**
 * Largest folder payload we will put in a QR code.
 *
 * A version-40 QR at low error correction tops out near 2,950 bytes; staying under that keeps the
 * code scannable on a normal phone screen instead of degenerating into an unreadable grid.
 */
export const QR_PAYLOAD_MAX_BYTES = 2200;

/** Notification channel id used on Android. */
export const ANDROID_NOTIFICATION_CHANNEL = 'reminders';

/** Default icon assigned to a new folder (Lucide icon name — see `constants/icons.ts`). */
export const DEFAULT_FOLDER_ICON = 'folder';
export const DEFAULT_FOLDER_COLOR = '#4f46e5';
