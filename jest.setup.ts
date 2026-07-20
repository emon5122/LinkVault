/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */
// Global mocks for native modules that have no JS implementation under Jest/node.
// (@testing-library/react-native v14 auto-registers its matchers via the jest-expo preset.)

// expo-sqlite/kv-store needs a real SQLite database; back it with an in-memory Map for tests.
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const storage = {
    getItemSync: (key: string) => store.get(key) ?? null,
    setItemSync: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItemSync: (key: string) => store.delete(key),
    getAllKeysSync: () => Array.from(store.keys()),
    clearSync: () => {
      store.clear();
      return true;
    },
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItemAsync: async (key: string) => store.delete(key),
  };
  return { __esModule: true, default: storage, Storage: storage, AsyncStorage: storage };
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
