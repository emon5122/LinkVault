/**
 * Opportunistic upkeep: fill in missing article text, then re-check stale links.
 *
 * Runs a short while after launch and again when the app returns to the foreground, never while it
 * is backgrounded. Both passes are deliberately small and sequential — extraction first (it makes
 * links useful), health second (it only reports) — so upkeep never competes with what the user is
 * actually doing, and a phone on cellular isn't hit with dozens of parallel requests.
 *
 * Everything is best-effort. Failures are swallowed: the next launch retries.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { extractionService, healthService } from '@/services';
import { useSettingsStore } from '@/store';

import { useInvalidateLibrary } from './use-invalidate';

/** Delay before the first pass, so launch and first paint stay uncontended. */
const START_DELAY_MS = 4000;

/** Minimum gap between passes, so foreground/background flapping can't spam the network. */
const MIN_INTERVAL_MS = 1000 * 60 * 15;

/**
 * Throttle state lives at module scope, not in a ref.
 *
 * A ref is recreated whenever the component remounts — which Fast Refresh does on every save during
 * development, and a navigator remount can do in production. That reset would let a fresh sweep
 * start immediately, defeating the interval guard and hammering the network. Module scope survives
 * remounts and only resets when the JS context itself is torn down.
 */
let lastRunAt = 0;
let sweepInFlight = false;

export function useBackgroundMaintenance() {
  const autoExtract = useSettingsStore((s) => s.autoExtractArticles);
  const autoCheck = useSettingsStore((s) => s.autoCheckLinks);
  const invalidate = useInvalidateLibrary();

  useEffect(() => {
    if (!autoExtract && !autoCheck) return;

    let cancelled = false;

    const run = async () => {
      if (sweepInFlight) return;
      if (Date.now() - lastRunAt < MIN_INTERVAL_MS) return;

      sweepInFlight = true;
      lastRunAt = Date.now();

      let changed = false;
      try {
        if (autoExtract) {
          const result = await extractionService.runExtractionSweep();
          changed ||= result.extracted > 0;
        }
        if (!cancelled && autoCheck) {
          const result = await healthService.runHealthSweep();
          changed ||= result.checked > 0;
        }
      } catch {
        /* offline or interrupted — retried on the next foreground */
      } finally {
        sweepInFlight = false;
        // Invalidate only when something actually changed: an unconditional refresh here would
        // re-render every list on a sweep that found nothing to do.
        if (changed && !cancelled) invalidate();
      }
    };

    const timer = setTimeout(run, START_DELAY_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [autoExtract, autoCheck, invalidate]);
}
