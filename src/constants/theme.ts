/**
 * Design tokens for LinkVault.
 *
 * `Palette` mirrors the CSS custom properties in `src/global.css` so that imperative consumers
 * (Lucide icon `color` props, the navigation theme, `StatusBar`, Reanimated colors) can read the
 * same values NativeWind resolves for `className`s. Keep the two files in sync.
 */
import { Platform } from 'react-native';

export const Palette = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    surface: '#f8fafc',
    card: '#ffffff',
    cardForeground: '#0f172a',
    primary: '#4f46e5',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    secondaryForeground: '#1e293b',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#eef2ff',
    accentForeground: '#4338ca',
    destructive: '#e11d48',
    destructiveForeground: '#ffffff',
    success: '#059669',
    warning: '#d97706',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#4f46e5',
  },
  dark: {
    background: '#0b1120',
    foreground: '#f1f5f9',
    surface: '#131a2c',
    card: '#161d30',
    cardForeground: '#f1f5f9',
    primary: '#6366f1',
    primaryForeground: '#ffffff',
    secondary: '#1e293b',
    secondaryForeground: '#f1f5f9',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    accent: '#312e81',
    accentForeground: '#c7d2fe',
    destructive: '#fb7185',
    destructiveForeground: '#1c1917',
    success: '#34d399',
    warning: '#fbbf24',
    border: '#1e293b',
    input: '#334155',
    ring: '#6366f1',
  },
} as const;

export type ThemeName = 'light' | 'dark';
/** Structural color map (values widened to `string` so light and dark are interchangeable). */
export type ThemeColors = Record<keyof (typeof Palette)['light'], string>;

/** Curated palette offered to the user when picking folder colors. */
export const FolderColors = [
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#db2777', // pink
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // amber
  '#16a34a', // green
  '#0d9488', // teal
  '#0891b2', // cyan
  '#4b5563', // slate
] as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const MaxContentWidth = 720;
