/** React Query hooks for tags. */
import { useMutation, useQuery } from '@tanstack/react-query';

import { tagsRepository } from '@/database';

import { queryKeys } from './query-keys';
import { useInvalidateLibrary } from './use-invalidate';

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags.root, queryFn: () => tagsRepository.list() });
}

export function useTagsWithCounts() {
  return useQuery({
    queryKey: queryKeys.tags.withCounts,
    queryFn: () => tagsRepository.listWithCounts(),
  });
}

export function useTag(id: number | null) {
  return useQuery({
    queryKey: id != null ? queryKeys.tags.detail(id) : ['tags', 'detail', 'none'],
    queryFn: () => tagsRepository.getById(id as number),
    enabled: id != null,
  });
}

export function useCreateTag() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (name: string) => tagsRepository.getOrCreate(name),
    onSuccess: invalidate,
  });
}

export function useRenameTag() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => tagsRepository.rename(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => tagsRepository.remove(id),
    onSuccess: invalidate,
  });
}
