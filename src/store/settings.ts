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

export interface SettingsState {
  theme: ThemePreference;
  openInApp: boolean;
  clipboardMonitoring: boolean;
  hapticsEnabled: boolean;
  viewMode: ViewMode;
  defaultSort: LinkSort;
  confirmBeforeDelete: boolean;
  reminders: ReminderSettings;

  setTheme: (theme: ThemePreference) => void;
  setOpenInApp: (value: boolean) => void;
  setClipboardMonitoring: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setDefaultSort: (sort: LinkSort) => void;
  setConfirmBeforeDelete: (value: boolean) => void;
  setReminders: (patch: Partial<ReminderSettings>) => void;
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

      setTheme: (theme) => set({ theme }),
      setOpenInApp: (openInApp) => set({ openInApp }),
      setClipboardMonitoring: (clipboardMonitoring) => set({ clipboardMonitoring }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setViewMode: (viewMode) => set({ viewMode }),
      setDefaultSort: (defaultSort) => set({ defaultSort }),
      setConfirmBeforeDelete: (confirmBeforeDelete) => set({ confirmBeforeDelete }),
      setReminders: (patch) => set((state) => ({ reminders: { ...state.reminders, ...patch } })),
    }),
    {
      name: 'linkvault.settings',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
    },
  ),
);
