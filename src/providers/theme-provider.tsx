/**
 * Bridges the persisted theme preference to both styling systems:
 *  - NativeWind (`className` / `dark:` variants) via `colorScheme.set`
 *  - imperative consumers (icon colors, StatusBar, navigation) via the `useTheme` context.
 */
import { colorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { Palette, type ThemeColors, type ThemeName } from '@/constants/theme';
import { useSettingsStore, type ThemePreference } from '@/store';

interface ThemeContextValue {
  name: ThemeName;
  colors: ThemeColors;
  preference: ThemePreference;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const name: ThemeName = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  // Drive NativeWind. Passing 'system' lets it track the OS; otherwise it's pinned.
  useEffect(() => {
    colorScheme.set(preference);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ name, colors: Palette[name], preference, isDark: name === 'dark' }),
    [name, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the active theme name + resolved color values. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
