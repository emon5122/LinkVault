/** React Query hooks for reader highlights. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { highlightsRepository } from '@/database';
import type { NewHighlightInput } from '@/types';

import { queryKeys } from './query-keys';

function useInvalidateHighlights() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.highlights.root });
  }, [queryClient]);
}

export function useHighlights(linkId: number | null) {
  return useQuery({
    queryKey: linkId != null ? queryKeys.highlights.forLink(linkId) : ['highlights', 'link', 'none'],
    queryFn: () => highlightsRepository.listForLink(linkId as number),
    enabled: linkId != null,
  });
}

export function useAllHighlights(limit = 200) {
  return useQuery({
    queryKey: [...queryKeys.highlights.all, limit],
    queryFn: () => highlightsRepository.listAll(limit),
  });
}

export function useHighlightCount(linkId: number | null) {
  return useQuery({
    queryKey: linkId != null ? queryKeys.highlights.count(linkId) : ['highlights', 'count', 'none'],
    queryFn: () => highlightsRepository.countForLink(linkId as number),
    enabled: linkId != null,
  });
}

export function useCreateHighlight() {
  const invalidate = useInvalidateHighlights();
  return useMutation({
    mutationFn: (input: NewHighlightInput) => highlightsRepository.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteHighlight() {
  const invalidate = useInvalidateHighlights();
  return useMutation({
    mutationFn: (id: number) => highlightsRepository.remove(id),
    onSuccess: invalidate,
  });
}

export function useSetHighlightNote() {
  const invalidate = useInvalidateHighlights();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string | null }) =>
      highlightsRepository.setNote(id, note),
    onSuccess: invalidate,
  });
}
