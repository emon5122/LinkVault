/** Centralized React Query key factory so invalidation stays consistent across hooks. */
import type { LinkListParams, LinkScope, LinkSort } from '@/types';

export const queryKeys = {
  links: {
    root: ['links'] as const,
    list: (params: LinkListParams) => ['links', 'list', params] as const,
    infinite: (scope: LinkScope, sort: LinkSort | undefined) =>
      ['links', 'infinite', scope, sort ?? null] as const,
    detail: (id: number) => ['links', 'detail', id] as const,
    count: (scope: LinkScope) => ['links', 'count', scope] as const,
    search: (query: string) => ['links', 'search', query] as const,
  },
  folders: {
    root: ['folders'] as const,
    withCounts: ['folders', 'withCounts'] as const,
    detail: (id: number) => ['folders', 'detail', id] as const,
  },
  tags: {
    root: ['tags'] as const,
    withCounts: ['tags', 'withCounts'] as const,
    detail: (id: number) => ['tags', 'detail', id] as const,
  },
  highlights: {
    root: ['highlights'] as const,
    forLink: (linkId: number) => ['highlights', 'link', linkId] as const,
    all: ['highlights', 'all'] as const,
    count: (linkId: number) => ['highlights', 'count', linkId] as const,
  },
  health: {
    root: ['health'] as const,
    summary: ['health', 'summary'] as const,
  },
  stats: ['stats'] as const,
  metadata: (url: string) => ['metadata', url] as const,
} as const;
