import 'react-native-url-polyfill/auto';
import '@/global.css';

import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useCallback, useEffect } from 'react';

import { useBackgroundMaintenance } from '@/hooks';
import { AppProviders, useTheme } from '@/providers';
import { linkingService } from '@/services';

SplashScreen.preventAutoHideAsync();

/**
 * Turns any incoming URL — deep link, notification `data.url`, or a shared web link — into
 * navigation. All three entry points funnel through here so the routing rules live in one place.
 */
function useIncomingUrl() {
  const router = useRouter();
  return useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      const intent = linkingService.parseIncomingUrl(url);
      if (!intent) return;
      if (intent.type === 'add') {
        router.push({ pathname: '/add', params: intent.url ? { url: intent.url } : {} });
      } else if (intent.type === 'openLink') {
        router.push({ pathname: '/link/[id]', params: { id: String(intent.id) } });
      }
    },
    [router],
  );
}

/** Deep links: linkvault://add?url=…, https://linkvault.app/add, linkvault://link/42 */
function useDeepLinks(handle: (url: string | null) => void) {
  useEffect(() => {
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => handle(event.url));
    return () => sub.remove();
  }, [handle]);
}

/** Tapping a reminder notification jumps to the link/list its `data.url` points at. */
function useNotificationTaps(handle: (url: string | null) => void) {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') handle(url);
  }, [response, handle]);
}

/**
 * System share sheet (Android/iOS).
 *
 * One URL goes straight to the Add form. *Several* URLs — a list pasted out of a group chat, a
 * shared LinkVault folder, a newsletter — go to the bulk importer instead, which is what makes
 * folder sharing work without either side agreeing on a format.
 */
function useShareToSave(handle: (url: string | null) => void) {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;

    // A shared file (a `.linkvault` bundle, an exported list) — hand the importer its URI to read.
    const file = shareIntent.files?.[0];
    if (file?.path) {
      router.push({ pathname: '/bulk-add', params: { fileUri: file.path, source: 'a file' } });
      resetShareIntent();
      return;
    }

    if (shareIntent.webUrl) {
      handle(shareIntent.webUrl);
      resetShareIntent();
      return;
    }

    const urls = shareIntent.text ? linkingService.extractAllUrls(shareIntent.text) : [];
    if (urls.length > 1) {
      router.push({
        pathname: '/bulk-add',
        params: { text: shareIntent.text as string, source: 'a shared message' },
      });
    } else if (urls.length === 1) {
      handle(urls[0]);
    } else {
      router.push('/add'); // shared something without a URL — still land on the form
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, handle, router]);
}

function RootStack() {
  const { colors } = useTheme();
  const handle = useIncomingUrl();
  useDeepLinks(handle);
  useNotificationTaps(handle);
  useShareToSave(handle);
  useBackgroundMaintenance();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="link/[id]" />
      <Stack.Screen name="reader/[id]" />
      <Stack.Screen name="folder/[id]" />
      <Stack.Screen name="tag/[id]" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="read-later" />
      <Stack.Screen name="archive" />
      <Stack.Screen name="pinned" />
      <Stack.Screen name="broken" />
      <Stack.Screen name="readable" />
      <Stack.Screen name="highlights" />
      <Stack.Screen name="tags" />
      <Stack.Screen name="folder-share" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="bulk-add"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <AppProviders>
        <RootStack />
      </AppProviders>
    </ShareIntentProvider>
  );
}
