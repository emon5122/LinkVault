/**
 * Share a folder — text, file, or QR.
 *
 * All three tiers are backend-free by design; see `services/share-folder` for why the text tier is
 * the primary one (a recipient without LinkVault still gets a usable list).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileJson, MessageSquareShare, QrCode, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Header, ListGroup, ListRow, Screen, Text } from '@/components/ui';
import { useFolder, useLinkCount } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { shareFolderService } from '@/services';
import type { QrPayloadResult } from '@/services';
import { pluralize } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function FolderShareScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = Number(id);

  const folder = useFolder(folderId);
  const count = useLinkCount({ type: 'folder', folderId });

  const [busy, setBusy] = useState<'text' | 'file' | 'qr' | null>(null);
  const [qr, setQr] = useState<QrPayloadResult | null>(null);

  const name = folder.data?.name ?? 'Folder';

  const run = async (kind: 'text' | 'file' | 'qr', action: () => Promise<void>) => {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      Alert.alert("Couldn't share folder", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const shareAsText = () =>
    run('text', async () => {
      const { text, count: shared } = await shareFolderService.shareFolderAsText(folderId);
      if (shared === 0) {
        Alert.alert('Nothing to share', 'This folder has no links yet.');
        return;
      }
      haptics.light();
      await Share.share({ message: text, title: name });
    });

  const shareAsFile = () =>
    run('file', async () => {
      const result = await shareFolderService.shareFolderAsFile(folderId);
      if (!result.shared) {
        Alert.alert('Sharing unavailable', 'This device has no app to receive the file.');
      }
    });

  const showQr = () =>
    run('qr', async () => {
      const result = await shareFolderService.buildFolderQr(folderId);
      if (result.included === 0) {
        Alert.alert('Folder too large for QR', 'Share it as a file or text instead.');
        return;
      }
      haptics.light();
      setQr(result);
    });

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="Share folder"
        subtitle={count.data != null ? `${name} · ${pluralize(count.data, 'link')}` : name}
        showBack
      />

      <View className="gap-5 p-4">
        <ListGroup>
          <ListRow
            icon={MessageSquareShare}
            title="Send as a message"
            subtitle="Readable list for WhatsApp, Signal, email — works without the app"
            onPress={busy ? undefined : shareAsText}
          />
          <ListRow
            icon={FileJson}
            title="Send as a file"
            subtitle="Keeps notes, tags, and folder styling"
            onPress={busy ? undefined : shareAsFile}
          />
          <ListRow
            icon={QrCode}
            title="Show a QR code"
            subtitle="Transfer to a nearby device with no network"
            onPress={busy ? undefined : showQr}
          />
        </ListGroup>

        {busy ? (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        ) : null}

        {qr ? (
          <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5">
            {/* The QR renders on a fixed white field regardless of theme — scanners need the
                contrast, and a dark-on-dark code is unreadable. */}
            <View className="rounded-2xl bg-white p-3">
              <QRCode
                value={qr.payload}
                size={232}
                backgroundColor="#ffffff"
                color="#000000"
                ecl="L"
              />
            </View>
            <Text variant="caption" className="text-center">
              Scan from the other device: Library → Scan a folder code
            </Text>
            {qr.omitted > 0 ? (
              <Text variant="caption" className="text-center text-destructive">
                Only the first {qr.included} links fit in a scannable code. {qr.omitted} were left
                out — share as a file to send all of them.
              </Text>
            ) : null}
          </View>
        ) : null}

        <Button
          title="Scan a folder code instead"
          variant="ghost"
          icon={Share2}
          onPress={() => router.push('/scan')}
        />
      </View>
    </Screen>
  );
}
