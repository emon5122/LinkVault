/**
 * Local reminder notifications (Read Later nudges + optional daily/weekly digests).
 *
 * All scheduling is local (no push server). Requires a development/production build — notifications
 * are limited in Expo Go. Every call is guarded so a denied permission never throws into the UI.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ANDROID_NOTIFICATION_CHANNEL, APP_SCHEME } from '@/constants/config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120, 80, 120],
    lightColor: '#2563eb',
  });
  channelReady = true;
}

/** Ask for notification permission (idempotent). Returns whether it is granted. */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function hasPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

const deepLink = (path: string) => `${APP_SCHEME}://${path}`;

/** Schedule a one-off Read Later reminder for a specific link. Returns the notification id. */
export async function scheduleReadLaterReminder(
  link: { id: number; title: string },
  date: Date,
): Promise<string | null> {
  if (!(await requestPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to read',
      body: link.title,
      data: { url: deepLink(`link/${link.id}`), linkId: link.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: ANDROID_NOTIFICATION_CHANNEL,
    },
  });
}

/** Schedule (or reschedule) a repeating daily reminder to review saved links. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  if (!(await requestPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your LinkVault',
      body: 'You have links waiting to be read.',
      data: { url: deepLink('read-later') },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_NOTIFICATION_CHANNEL,
    },
  });
}

/** Schedule a repeating weekly reminder. `weekday` is 1 (Sunday) – 7 (Saturday). */
export async function scheduleWeeklyReminder(
  weekday: number,
  hour: number,
  minute: number,
): Promise<string | null> {
  if (!(await requestPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly review',
      body: 'Catch up on the links you saved this week.',
      data: { url: deepLink('read-later') },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: ANDROID_NOTIFICATION_CHANNEL,
    },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
