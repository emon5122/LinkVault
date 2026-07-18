/** React Query hooks for reading and mutating links. */
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { PAGE_SIZE } from '@/constants/config';
import { linksRepository } from '@/database';
import type {
  LinkListParams,
  LinkScope,
  LinkSort,
  LinkWithRelations,
  NewLinkInput,
  UpdateLinkInput,
} from '@/types';

import { queryKeys } from './query-keys';
import { useInvalidateLibrary } from './use-invalidate';

type LinkFlag = 'favorite' | 'readLater' | 'archived' | 'pinned';

/** Paginated, infinite list of links for a scope. `links` is the flattened, ready-to-render list. */
export function useInfiniteLinks(scope: LinkScope, sort?: LinkSort, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.links.infinite(scope, sort),
    initialPageParam: 0,
    enabled,
    queryFn: ({ pageParam }) =>
      linksRepository.list({ scope, sort, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    select: (data) => data.pages.flat(),
  });

  return { ...query, links: query.data ?? [] };
}

/** A simple (non-paginated) list, used for the Home carousels with a small limit. */
export function useLinks(params: LinkListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.links.list(params),
    queryFn: () => linksRepository.list(params),
    enabled,
  });
}

export function useLinkDetail(id: number | null) {
  return useQuery({
    queryKey: id != null ? queryKeys.links.detail(id) : ['links', 'detail', 'none'],
    queryFn: () => linksRepository.getByIdWithRelations(id as number),
    enabled: id != null,
  });
}

export function useLinkCount(scope: LinkScope, enabled = true) {
  return useQuery({
    queryKey: queryKeys.links.count(scope),
    queryFn: () => linksRepository.countByScope(scope),
    enabled,
  });
}

export function useSearchLinks(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.links.search(trimmed),
    queryFn: () => linksRepository.search(trimmed),
    enabled: trimmed.length > 0,
    placeholderData: (prev) => prev,
  });
}

export function useCreateLink() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: NewLinkInput) => linksRepository.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateLink() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateLinkInput }) =>
      linksRepository.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLink() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => linksRepository.remove(id),
    onSuccess: invalidate,
  });
}

export function useToggleLinkFlag() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, flag }: { id: number; flag: LinkFlag }) =>
      linksRepository.toggleFlag(id, flag),
    onSuccess: invalidate,
  });
}

export function useSetLinkFlag() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, flag, value }: { id: number; flag: LinkFlag; value: boolean }) =>
      linksRepository.setFlag(id, flag, value),
    onSuccess: invalidate,
  });
}

export function useMarkRead() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, read = true }: { id: number; read?: boolean }) =>
      linksRepository.markRead(id, read),
    onSuccess: invalidate,
  });
}

/** Records that a link was opened. Fire-and-forget; only refreshes "recently opened". */
export function useRecordOpen() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => linksRepository.recordOpen(id),
    onSuccess: invalidate,
  });
}

export function useEmptyArchive() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: () => linksRepository.emptyArchive(),
    onSuccess: invalidate,
  });
}

/** Look up a possible duplicate by canonical URL (used by the Add form). */
export function useDuplicateCheck(url: string, enabled: boolean) {
  return useQuery({
    queryKey: ['links', 'duplicate', url],
    queryFn: () => linksRepository.findByNormalizedUrl(url),
    enabled,
    staleTime: 0,
  });
}

export type { LinkFlag, LinkWithRelations };
