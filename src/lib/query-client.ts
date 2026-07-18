import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Because all data is local (SQLite), queries are cheap to refetch, so
 * we keep a short stale time and invalidate broadly after mutations rather than hand-tuning caches.
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
    },
  },
});
