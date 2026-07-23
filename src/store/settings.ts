/**
 * Persisted user settings (theme, browser behavior, clipboard monitoring, haptics, default views,
 * and reminder schedules). Backed by the SQLite kv-store via the Zustand `persist` middleware.
 *
 * The store holds state only; side effects (scheduling notifications, toggling the haptics flag) are
 * wired up where they belong — the Settings screen and the app providers — so the store stays sync.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LinkSort } from '@/types';
import { zustandStorage } from '@/services/storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ViewMode = 'list' | 'grid';

export interface ReminderSettings {
  dailyEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  weeklyEnabled: boolean;
  /** 1 = Sunday … 7 = Saturday (expo-notifications convention). */
  weeklyWeekday: number;
  weeklyHour: number;
  weeklyMinute: number;
}

/** Reader text sizes, as multipliers of the base body size. */
export const READER_FONT_SCALES = [0.9, 1, 1.15, 1.35] as const;
export type ReaderFontScale = (typeof READER_FONT_SCALES)[number];

export interface SettingsState {
  theme: ThemePreference;
  openInApp: boolean;
  clipboardMonitoring: boolean;
  hapticsEnabled: boolean;
  viewMode: ViewMode;
  defaultSort: LinkSort;
  confirmBeforeDelete: boolean;
  reminders: ReminderSettings;
  /** Fetch and store article text so links stay searchable and readable offline. */
  autoExtractArticles: boolean;
  /** Periodically re-check saved links for rot. */
  autoCheckLinks: boolean;
  readerFontScale: ReaderFontScale;
  highlightColor: string;
  /**
   * Android package of the browser to render links with, or null for the system default.
   * Ignored on iOS, which permits no substitute for Safari's engine.
   */
  browserPackage: string | null;

  setTheme: (theme: ThemePreference) => void;
  setOpenInApp: (value: boolean) => void;
  setClipboardMonitoring: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setDefaultSort: (sort: LinkSort) => void;
  setConfirmBeforeDelete: (value: boolean) => void;
  setReminders: (patch: Partial<ReminderSettings>) => void;
  setAutoExtractArticles: (value: boolean) => void;
  setAutoCheckLinks: (value: boolean) => void;
  setReaderFontScale: (scale: ReaderFontScale) => void;
  setHighlightColor: (color: string) => void;
  setBrowserPackage: (packageName: string | null) => void;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  dailyEnabled: false,
  dailyHour: 9,
  dailyMinute: 0,
  weeklyEnabled: false,
  weeklyWeekday: 2,
  weeklyHour: 9,
  weeklyMinute: 0,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      openInApp: true,
      clipboardMonitoring: true,
      hapticsEnabled: true,
      viewMode: 'list',
      defaultSort: 'createdDesc',
      confirmBeforeDelete: true,
      reminders: DEFAULT_REMINDERS,
      autoExtractArticles: true,
      autoCheckLinks: true,
      readerFontScale: 1,
      highlightColor: 'yellow',
      browserPackage: null,

      setTheme: (theme) => set({ theme }),
      setOpenInApp: (openInApp) => set({ openInApp }),
      setClipboardMonitoring: (clipboardMonitoring) => set({ clipboardMonitoring }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setViewMode: (viewMode) => set({ viewMode }),
      setDefaultSort: (defaultSort) => set({ defaultSort }),
      setConfirmBeforeDelete: (confirmBeforeDelete) => set({ confirmBeforeDelete }),
      setReminders: (patch) => set((state) => ({ reminders: { ...state.reminders, ...patch } })),
      setAutoExtractArticles: (autoExtractArticles) => set({ autoExtractArticles }),
      setAutoCheckLinks: (autoCheckLinks) => set({ autoCheckLinks }),
      setReaderFontScale: (readerFontScale) => set({ readerFontScale }),
      setHighlightColor: (highlightColor) => set({ highlightColor }),
      setBrowserPackage: (browserPackage) => set({ browserPackage }),
    }),
    {
      name: 'linkvault.settings',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
    },
  ),
);
