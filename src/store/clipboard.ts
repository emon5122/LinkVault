/**
 * Session state for the "Save copied link?" suggestion. Tracks which clipboard URLs the user has
 * dismissed (or already saved) so the banner doesn't nag. Kept in memory — dismissals reset on
 * relaunch, which is the desired behavior.
 */
import { create } from 'zustand';

import { CLIPBOARD_SUGGESTION_TTL_MS } from '@/constants/config';
import { normalizeUrl } from '@/utils/url';

interface ClipboardState {
  dismissed: Record<string, number>;
  dismiss: (url: string) => void;
  isDismissed: (url: string) => boolean;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  dismissed: {},
  dismiss: (url) =>
    set((state) => ({ dismissed: { ...state.dismissed, [normalizeUrl(url)]: Date.now() } })),
  isDismissed: (url) => {
    const at = get().dismissed[normalizeUrl(url)];
    if (at == null) return false;
    return Date.now() - at < CLIPBOARD_SUGGESTION_TTL_MS;
  },
  clear: () => set({ dismissed: {} }),
}));
