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

/** Backup format version, bumped when the export schema changes. */
export const BACKUP_FORMAT_VERSION = 1;

/** Notification channel id used on Android. */
export const ANDROID_NOTIFICATION_CHANNEL = 'reminders';

/** Default icon assigned to a new folder (Lucide icon name — see `constants/icons.ts`). */
export const DEFAULT_FOLDER_ICON = 'folder';
export const DEFAULT_FOLDER_COLOR = '#4f46e5';
