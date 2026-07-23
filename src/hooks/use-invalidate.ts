import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Returns a function that invalidates every data query affected by a link/folder/tag change.
 * Local queries are cheap, so broad invalidation keeps counts, sections, and lists consistent
 * without fragile per-key bookkeeping.
 *
 * `health` belongs here even though nothing on this path writes a status directly: its summary is
 * derived from columns on `links` (extracted content, check results), so any link write can move
 * those counts. Leaving it out left the Library's "Saved offline" card showing a stale number after
 * a background extraction sweep.
 */
export function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['health'] });
    queryClient.invalidateQueries({ queryKey: ['highlights'] });
  }, [queryClient]);
}
