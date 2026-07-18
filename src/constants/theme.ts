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
    foreground: '#18181b',
    surface: '#f7f7f8',
    card: '#ffffff',
    cardForeground: '#18181b',
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryForeground: '#27272a',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    accent: '#eef2ff',
    accentForeground: '#1e3a8a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    success: '#16a34a',
    warning: '#d97706',
    border: '#e4e4e7',
    input: '#e4e4e7',
    ring: '#2563eb',
  },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    surface: '#131316',
    card: '#18181b',
    cardForeground: '#fafafa',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#27272a',
    secondaryForeground: '#fafafa',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    accent: '#1e293b',
    accentForeground: '#bfdbfe',
    destructive: '#f87171',
    destructiveForeground: '#18181b',
    success: '#4ade80',
    warning: '#fbbf24',
    border: '#27272a',
    input: '#3f3f46',
    ring: '#3b82f6',
  },
} as const;

export type ThemeName = 'light' | 'dark';
/** Structural color map (values widened to `string` so light and dark are interchangeable). */
export type ThemeColors = Record<keyof (typeof Palette)['light'], string>;

/** Curated palette offered to the user when picking folder colors. */
export const FolderColors = [
  '#2563eb', // blue
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
