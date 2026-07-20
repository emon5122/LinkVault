import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

/**
 * Shared React Query client. Because all data is local (SQLite), queries are cheap to refetch, so
 * we keep a short stale time and invalidate broadly after mutations rather than hand-tuning caches.
 *
 * The default mutation `onError` surfaces DB failures to the user instead of failing silently — a
 * mutation that rejects would otherwise just skip its `onSuccess` (navigation/refresh) with no sign
 * anything went wrong. A hook can still pass its own `onError` to override this.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        Alert.alert(
          'Something went wrong',
          error instanceof Error ? error.message : 'The action could not be completed.',
        );
      },
    },
  },
});
