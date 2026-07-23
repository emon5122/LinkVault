/** React Query hooks for link health checks and article extraction. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { linksRepository } from '@/database';
import { extractionService, healthService } from '@/services';

import { queryKeys } from './query-keys';
import { useInvalidateLibrary } from './use-invalidate';

export function useHealthSummary() {
  return useQuery({
    queryKey: queryKeys.health.summary,
    queryFn: () => linksRepository.healthSummary(),
  });
}

/** Progress of a running sweep, so the UI can show "12 / 25" instead of an opaque spinner. */
export interface SweepProgress {
  done: number;
  total: number;
}

function useSweepInvalidation() {
  const invalidateLibrary = useInvalidateLibrary();
  const queryClient = useQueryClient();
  return useCallback(() => {
    invalidateLibrary();
    queryClient.invalidateQueries({ queryKey: queryKeys.health.root });
  }, [invalidateLibrary, queryClient]);
}

/** Check a batch of stale links and report progress while it runs. */
export function useHealthSweep() {
  const invalidate = useSweepInvalidation();
  const [progress, setProgress] = useState<SweepProgress | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      healthService.runHealthSweep({
        onProgress: (done, total) => setProgress({ done, total }),
      }),
    onSettled: () => {
      setProgress(null);
      invalidate();
    },
  });

  return { ...mutation, progress };
}

/** Extract article bodies for links that have never been through the pipeline. */
export function useExtractionSweep() {
  const invalidate = useSweepInvalidation();
  const [progress, setProgress] = useState<SweepProgress | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      extractionService.runExtractionSweep({
        onProgress: (done, total) => setProgress({ done, total }),
      }),
    onSettled: () => {
      setProgress(null);
      invalidate();
    },
  });

  return { ...mutation, progress };
}

/** Re-check a single link on demand, from its detail screen. */
export function useCheckLink() {
  const invalidate = useSweepInvalidation();
  return useMutation({
    mutationFn: async (linkId: number) => {
      const link = await linksRepository.getById(linkId);
      if (!link) return null;
      return healthService.checkLink(link);
    },
    onSuccess: invalidate,
  });
}

/** Fetch (or re-fetch) one link's article body on demand. */
export function useExtractArticle() {
  const invalidate = useSweepInvalidation();
  return useMutation({
    mutationFn: (linkId: number) => extractionService.reExtract(linkId),
    onSuccess: invalidate,
  });
}

/** Ask the Wayback Machine to archive a link now. Best-effort; resolves to false when refused. */
export function useArchiveNow() {
  const invalidate = useSweepInvalidation();
  return useMutation({
    mutationFn: async (linkId: number) => {
      const link = await linksRepository.getById(linkId);
      if (!link) return false;

      const queued = await healthService.requestWaybackSave(link.url);
      // The save endpoint doesn't return the snapshot URL, so look it up separately — if the save
      // is still processing this finds the previous snapshot, which is better than nothing.
      const snapshot = await healthService.findWaybackSnapshot(link.url);
      if (snapshot) {
        await linksRepository.setHealth(link.id, {
          status: link.status ?? 'unknown',
          statusCode: link.statusCode,
          archiveUrl: snapshot,
        });
      }
      return queued || Boolean(snapshot);
    },
    onSuccess: invalidate,
  });
}
