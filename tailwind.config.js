/** @type {import('tailwindcss').Config} */
// Semantic color tokens are backed by CSS variables declared in `src/global.css`.
// The variables are swapped for the `.dark` class, which NativeWind toggles based on the
// active color scheme (see `src/providers/theme-provider.tsx`).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
