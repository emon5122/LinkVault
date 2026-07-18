/**
 * Detects an unsaved URL on the clipboard so the UI can offer "Save copied link?".
 *
 * Re-checks when the app returns to the foreground and when the hosting screen regains focus.
 * Suppresses URLs the user dismissed (session-scoped) and URLs already in the library.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { linksRepository } from '@/database';
import { clipboardService } from '@/services';
import { useClipboardStore, useSettingsStore } from '@/store';

export function useClipboardUrl() {
  const monitoring = useSettingsStore((s) => s.clipboardMonitoring);
  const isDismissed = useClipboardStore((s) => s.isDismissed);
  const dismissUrl = useClipboardStore((s) => s.dismiss);
  const [url, setUrl] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!monitoring) {
      setUrl(null);
      return;
    }
    const candidate = await clipboardService.getClipboardUrl();
    if (!candidate || isDismissed(candidate)) {
      setUrl(null);
      return;
    }
    // Don't suggest a link that's already saved.
    const existing = await linksRepository.findByNormalizedUrl(candidate);
    setUrl(existing ? null : candidate);
  }, [monitoring, isDismissed]);

  // Re-check on app foreground. Initial + on-focus checks are handled by useFocusEffect below.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  // Re-check on screen focus.
  useFocusEffect(
    useCallback(() => {
      void check();
    }, [check]),
  );

  const dismiss = useCallback(() => {
    if (url) dismissUrl(url);
    setUrl(null);
  }, [url, dismissUrl]);

  return { url, dismiss, refresh: check };
}
