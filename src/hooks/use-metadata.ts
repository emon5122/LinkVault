/** Fetches Open Graph metadata for a URL, cached by React Query. */
import { useQuery } from '@tanstack/react-query';

import { metadataService } from '@/services';
import { isValidUrl } from '@/utils/url';

import { queryKeys } from './query-keys';

export function useMetadata(url: string | null, enabled = true) {
  const valid = !!url && isValidUrl(url);
  return useQuery({
    queryKey: queryKeys.metadata(url ?? ''),
    queryFn: () => metadataService.fetchMetadata(url as string),
    enabled: enabled && valid,
    staleTime: 10 * 60_000,
    retry: 0,
  });
}
