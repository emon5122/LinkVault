/** React Query hooks for folders. */
import { useMutation, useQuery } from '@tanstack/react-query';

import { foldersRepository } from '@/database';
import type { NewFolderInput, UpdateFolderInput } from '@/types';

import { queryKeys } from './query-keys';
import { useInvalidateLibrary } from './use-invalidate';

export function useFolders() {
  return useQuery({ queryKey: queryKeys.folders.root, queryFn: () => foldersRepository.list() });
}

export function useFoldersWithCounts() {
  return useQuery({
    queryKey: queryKeys.folders.withCounts,
    queryFn: () => foldersRepository.listWithCounts(),
  });
}

export function useFolder(id: number | null) {
  return useQuery({
    queryKey: id != null ? queryKeys.folders.detail(id) : ['folders', 'detail', 'none'],
    queryFn: () => foldersRepository.getById(id as number),
    enabled: id != null,
  });
}

export function useCreateFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: NewFolderInput) => foldersRepository.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFolderInput }) =>
      foldersRepository.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => foldersRepository.remove(id),
    onSuccess: invalidate,
  });
}

export function useReorderFolders() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (orderedIds: number[]) => foldersRepository.reorder(orderedIds),
    onSuccess: invalidate,
  });
}
