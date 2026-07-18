/** @type {import('jest').Config} */
// Uses the jest-expo preset. `transformIgnorePatterns` whitelists the RN/Expo ESM packages
// that ship untranspiled so Babel processes them. Native modules are mocked in `jest.setup.ts`.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // The `(.*/)?` prefix lets these packages be matched inside pnpm's
  // `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>` layout as well as a flat layout.
  transformIgnorePatterns: [
    `node_modules/(?!(.*/)?(?:${[
      '(jest-)?react-native',
      '@react-native',
      '@react-native-community',
      'expo',
      'expo-.*',
      '@expo',
      'react-navigation',
      '@react-navigation',
      'nativewind',
      'react-native-css-interop',
      '@shopify',
      'lucide-react-native',
      '@gorhom',
      'react-native-reanimated',
      'react-native-worklets',
      'react-native-gesture-handler',
      'react-native-safe-area-context',
      'react-native-screens',
      'react-native-svg',
      'react-native-url-polyfill',
      'react-native-mmkv',
    ].join('|')})/)`,
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
