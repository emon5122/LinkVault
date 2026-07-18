import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Returns a function that invalidates every data query affected by a link/folder/tag change.
 * Local queries are cheap, so broad invalidation keeps counts, sections, and lists consistent
 * without fragile per-key bookkeeping.
 */
export function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  }, [queryClient]);
}
