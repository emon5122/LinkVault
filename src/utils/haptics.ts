/**
 * Thin wrapper over expo-haptics. Every call is fire-and-forget and swallows errors (haptics are
 * unavailable on some devices/emulators). Respects a global enabled flag driven by the settings
 * store via `setHapticsEnabled`, avoiding a store import here (keeps this module dependency-free).
 */
import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function run(fn: () => Promise<void>): void {
  if (!enabled) return;
  fn().catch(() => {
    /* haptics are best-effort */
  });
}

export const haptics = {
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
