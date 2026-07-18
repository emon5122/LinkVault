/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */
// Global mocks for native modules that have no JS implementation under Jest/node.
// (@testing-library/react-native v14 auto-registers its matchers via the jest-expo preset.)

// react-native-mmkv is a Nitro (native) module; back it with an in-memory Map for tests.
jest.mock('react-native-mmkv', () => {
  const createMMKV = () => {
    const store = new Map<string, string | number | boolean>();
    return {
      set: (key: string, value: string | number | boolean) => store.set(key, value),
      getString: (key: string) => {
        const v = store.get(key);
        return typeof v === 'string' ? v : undefined;
      },
      getNumber: (key: string) => {
        const v = store.get(key);
        return typeof v === 'number' ? v : undefined;
      },
      getBoolean: (key: string) => {
        const v = store.get(key);
        return typeof v === 'boolean' ? v : undefined;
      },
      contains: (key: string) => store.has(key),
      remove: (key: string) => store.delete(key),
      getAllKeys: () => Array.from(store.keys()),
      clearAll: () => store.clear(),
    };
  };
  return { createMMKV, useMMKV: createMMKV };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(async () => ''),
  setStringAsync: jest.fn(async () => {}),
  hasUrlAsync: jest.fn(async () => false),
}));
