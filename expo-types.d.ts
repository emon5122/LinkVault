/// <reference types="expo/types" />

// Committed counterpart to the auto-generated, git-ignored `expo-env.d.ts`. It pulls in Expo's
// ambient types — notably the `*.css` module declaration behind `import '@/global.css'` — so that
// `tsc` in CI resolves them. CI never runs `expo` (which is what generates expo-env.d.ts), so
// without this file typecheck fails with TS2882 on the global.css side-effect import.
