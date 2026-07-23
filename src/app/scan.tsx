/**
 * Scan a folder QR code from another device.
 *
 * The payload is the same JSON bundle a `.linkvault` file carries, so everything downstream —
 * validation, folder creation, dedup — is shared with the file import path.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera, ScanLine } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Header, Screen, Text } from '@/components/ui';
import { shareFolderService } from '@/services';
import { haptics } from '@/utils/haptics';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);

  // The camera fires `onBarcodeScanned` continuously while a code is in frame; this latch makes the
  // first successful read the only one that navigates.
  const handled = useRef(false);

  if (!permission) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="Scan folder code" showBack />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="Scan folder code" showBack />
        <EmptyState
          icon={Camera}
          title="Camera access needed"
          message="LinkVault uses the camera only to read folder QR codes. Nothing is recorded or uploaded."
          actionLabel="Allow camera"
          onAction={() => requestPermission()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Scan folder code" subtitle="Point at the code on the other device" showBack />

      <View className="flex-1 overflow-hidden rounded-3xl border border-border m-4">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;

            const bundle = shareFolderService.parseFolderBundle(data);
            if (!bundle) {
              setError('That code isn’t a LinkVault folder.');
              return;
            }

            handled.current = true;
            haptics.success();
            router.replace({
              pathname: '/bulk-add',
              params: { bundle: JSON.stringify(bundle), source: 'QR code' },
            });
          }}
        />

        <View className="absolute inset-0 items-center justify-center">
          <View className="h-56 w-56 rounded-3xl border-2 border-white/80" />
        </View>
      </View>

      {error ? (
        <View className="px-4 pb-2">
          <Text variant="caption" className="text-center text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      <View className="px-4 pb-2">
        <Button
          title="Import from a file instead"
          variant="ghost"
          icon={ScanLine}
          onPress={() => router.replace('/bulk-add')}
        />
      </View>
    </Screen>
  );
}
