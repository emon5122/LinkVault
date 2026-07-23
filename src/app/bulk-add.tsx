/**
 * Import a shared list of links.
 *
 * Reached three ways, all converging on the same review-then-import flow:
 *  - a folder bundle scanned from a QR code or opened from a `.linkvault` file (`bundle` param)
 *  - text shared into the app that contained more than one URL (`text` param)
 *  - manually, by picking a file or pasting from the clipboard
 *
 * The user reviews what was found and can drop individual links before anything is written, because
 * shared text often carries stray URLs (a signature, a "sent from" footer) alongside the real list.
 */
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ClipboardPaste, FileUp, FolderPlus, Link2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button, EmptyState, Header, Input, Screen, Text } from '@/components/ui';
import { useInvalidateLibrary } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { fileService, importExportService, shareFolderService } from '@/services';
import type { ParsedLink } from '@/services';
import { pluralize } from '@/utils/format';
import { getDomain } from '@/utils/url';
import { haptics } from '@/utils/haptics';
import * as DocumentPicker from 'expo-document-picker';

/** Interpret whatever arrived: a structured bundle wins, otherwise fall back to text parsing. */
function readParams(params: { bundle?: string; text?: string }): {
  links: ParsedLink[];
  folderName: string;
} {
  if (params.bundle) {
    const bundle = shareFolderService.parseFolderBundle(params.bundle);
    if (bundle) {
      return {
        links: shareFolderService.bundleToParsedLinks(bundle),
        folderName: bundle.folder.name,
      };
    }
  }
  if (params.text) {
    return { links: importExportService.parseTextLinks(params.text), folderName: '' };
  }
  return { links: [], folderName: '' };
}

export default function BulkAddScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const invalidate = useInvalidateLibrary();
  const params = useLocalSearchParams<{
    bundle?: string;
    text?: string;
    fileUri?: string;
    source?: string;
  }>();

  const { bundle: bundleParam, text: textParam, fileUri, source } = params;
  const initial = useMemo(
    () => readParams({ bundle: bundleParam, text: textParam }),
    [bundleParam, textParam],
  );

  const [links, setLinks] = useState<ParsedLink[]>(initial.links);
  const [folderName, setFolderName] = useState(initial.folderName);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // A file shared into the app (a `.linkvault` bundle or a plain list) arrives as a URI, so it has
  // to be read asynchronously rather than parsed straight out of the route params. The guard is a
  // ref, not state, so re-running the effect never triggers a render of its own.
  const loadedUri = useRef<string | null>(null);
  useEffect(() => {
    if (!fileUri || fileUri === loadedUri.current) return;
    loadedUri.current = fileUri;

    let cancelled = false;
    fileService
      .readFileText(fileUri)
      .then((text) => {
        if (cancelled) return;
        const bundle = shareFolderService.parseFolderBundle(text);
        if (bundle) {
          setLinks(shareFolderService.bundleToParsedLinks(bundle));
          setFolderName(bundle.folder.name);
          return;
        }
        const parsed = importExportService.parseTextLinks(text);
        if (parsed.length === 0) {
          Alert.alert('No links found', "That file didn't contain any web links.");
          return;
        }
        setLinks(parsed);
      })
      .catch(() => {
        if (!cancelled) Alert.alert("Couldn't read file", 'The shared file could not be opened.');
      });

    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  const selected = links.filter((l) => !excluded.has(l.url));

  const toggle = (url: string) => {
    haptics.light();
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const loadFromText = (text: string, label: string) => {
    const parsed = importExportService.parseTextLinks(text);
    if (parsed.length === 0) {
      Alert.alert('No links found', `There were no web links in the ${label}.`);
      return;
    }
    setLinks(parsed);
    setExcluded(new Set());
    haptics.success();
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text?.trim()) {
      Alert.alert('Clipboard is empty', 'Copy a list of links first.');
      return;
    }
    loadFromText(text, 'clipboard');
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', 'text/markdown', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const text = await fileService.readFileText(result.assets[0].uri);

    // A `.linkvault` bundle carries a folder name and richer fields; anything else is plain text.
    const bundle = shareFolderService.parseFolderBundle(text);
    if (bundle) {
      setLinks(shareFolderService.bundleToParsedLinks(bundle));
      setFolderName(bundle.folder.name);
      setExcluded(new Set());
      haptics.success();
      return;
    }
    loadFromText(text, 'file');
  };

  const runImport = async () => {
    if (selected.length === 0) return;
    setImporting(true);
    try {
      const result = await importExportService.persistParsedLinks(selected, {
        intoFolder: folderName.trim() || undefined,
      });
      invalidate();
      haptics.success();

      const into = folderName.trim() ? ` into “${folderName.trim()}”` : '';
      Alert.alert(
        'Import complete',
        `Added ${pluralize(result.inserted, 'link')}${into}.` +
          (result.skipped > 0 ? `\n${result.skipped} already in your library.` : ''),
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  };

  if (links.length === 0) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="Import links" showBack />
        <EmptyState
          icon={Link2}
          title="Import a shared list"
          message="Paste a list of links, or open a folder file someone sent you."
        />
        <View className="gap-2 p-4">
          <Button title="Paste from clipboard" icon={ClipboardPaste} onPress={pasteFromClipboard} />
          <Button title="Open a file" variant="secondary" icon={FileUp} onPress={pickFile} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="Import links"
        subtitle={
          source ? `${pluralize(links.length, 'link')} from ${source}` : pluralize(links.length, 'link')
        }
        showBack
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
      >
        <Input
          label="Save into folder"
          placeholder="Optional — e.g. From Sam"
          value={folderName}
          onChangeText={setFolderName}
          maxLength={60}
        />

        <View className="gap-2">
          <Text variant="label">
            {selected.length === links.length
              ? `${pluralize(links.length, 'link')} to import`
              : `${selected.length} of ${links.length} selected`}
          </Text>

          {links.map((link) => {
            const off = excluded.has(link.url);
            return (
              <Pressable
                key={link.url}
                onPress={() => toggle(link.url)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !off }}
                accessibilityLabel={link.title || link.url}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80"
                style={off ? { opacity: 0.45 } : undefined}
              >
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: off ? colors.muted : colors.primary }}
                >
                  {off ? (
                    <X size={14} color={colors.mutedForeground} />
                  ) : (
                    <Check size={14} color={colors.primaryForeground} />
                  )}
                </View>
                <View className="flex-1">
                  <Text variant="body" numberOfLines={1} className="text-[15px]">
                    {link.title || link.url}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {getDomain(link.url)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="gap-2 border-t border-border p-4">
        <Button
          title={
            selected.length === 0 ? 'Select at least one link' : `Import ${selected.length} links`
          }
          icon={FolderPlus}
          size="lg"
          loading={importing}
          disabled={selected.length === 0 || importing}
          onPress={runImport}
        />
      </View>
    </Screen>
  );
}
