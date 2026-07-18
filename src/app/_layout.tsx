import 'react-native-url-polyfill/auto';
import '@/global.css';

import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppProviders, useTheme } from '@/providers';
import { linkingService } from '@/services';
import * as Linking from 'expo-linking';

SplashScreen.preventAutoHideAsync();

/** Handles deep links (linkvault://add?url=…, https://linkvault.app/add, linkvault://link/42). */
function useDeepLinks() {
  const router = useRouter();
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const intent = linkingService.parseIncomingUrl(url);
      if (!intent) return;
      if (intent.type === 'add') {
        router.push({ pathname: '/add', params: intent.url ? { url: intent.url } : {} });
      } else if (intent.type === 'openLink') {
        router.push({ pathname: '/link/[id]', params: { id: String(intent.id) } });
      }
    };

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (event) => handle(event.url));
    return () => sub.remove();
  }, [router]);
}

function RootStack() {
  const { colors } = useTheme();
  useDeepLinks();

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
      <Stack.Screen name="folder/[id]" />
      <Stack.Screen name="tag/[id]" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="read-later" />
      <Stack.Screen name="archive" />
      <Stack.Screen name="pinned" />
      <Stack.Screen name="tags" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
