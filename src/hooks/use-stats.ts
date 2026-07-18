/** Library-wide aggregate counts (Settings/About + empty-state gating). */
import { useQuery } from '@tanstack/react-query';

import { statsRepository } from '@/database';

import { queryKeys } from './query-keys';

export function useLibraryStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: () => statsRepository.getOverview() });
}
