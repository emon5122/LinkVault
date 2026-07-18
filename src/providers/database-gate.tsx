/**
 * Blocks rendering until the database is migrated and (on first run) seeded, keeping the native
 * splash screen up meanwhile. Also mirrors the persisted haptics preference into the haptics util.
 */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { initDatabase } from '@/database/client';
import { seedSampleDataIfNeeded } from '@/database/seed';
import { useSettingsStore } from '@/store';
import { setHapticsEnabled } from '@/utils/haptics';

export function DatabaseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  // Keep the haptics util in sync with the setting.
  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        await seedSampleDataIfNeeded();
        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error('[LinkVault] database init failed', error);
        if (!cancelled) setStatus('error');
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') return null; // native splash remains visible

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-lg font-semibold text-foreground">
          Something went wrong
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          LinkVault couldn&apos;t open its database. Please restart the app.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
