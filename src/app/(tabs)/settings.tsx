import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  BookOpenText,
  Bell,
  CalendarClock,
  ClipboardPaste,
  DatabaseBackup,
  Download,
  FileJson,
  FileText,
  Fingerprint,
  Globe,
  Grid2x2,
  Import,
  Info,
  List,
  RefreshCw,
  ShieldCheck,
  Trash,
  Unlink,
  Upload,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  ActionSheet,
  Header,
  ListGroup,
  ListRow,
  Screen,
  SegmentedControl,
  Switch,
  Text,
} from '@/components/ui';
import type { ActionSheetItem } from '@/components/ui';
import { browserDisplayName } from '@/constants/browsers';
import { APP_TAGLINE } from '@/constants/config';
import {
  useExtractionSweep,
  useHealthSummary,
  useHealthSweep,
  useInvalidateLibrary,
} from '@/hooks';
import { backupService, browserService, importExportService, notificationService } from '@/services';
import type { BrowserChoice } from '@/services/browser';
import {
  useSettingsStore,
  type ReminderSettings,
  type ThemePreference,
  type ViewMode,
} from '@/store';
import { haptics } from '@/utils/haptics';
import { riseIn } from '@/utils/motion';

export default function SettingsScreen() {
  const router = useRouter();
  const invalidate = useInvalidateLibrary();
  const importSheet = useRef<BottomSheetModal>(null);
  const exportSheet = useRef<BottomSheetModal>(null);

  const settings = useSettingsStore();
  const health = useHealthSummary();
  const browserSheet = useRef<BottomSheetModal>(null);

  // Which browsers this device can render a Custom Tab with. Queried once — installing a browser
  // mid-session is rare enough not to warrant watching for it.
  const [browsers, setBrowsers] = useState<BrowserChoice[]>([]);
  useEffect(() => {
    browserService.listBrowsers().then(setBrowsers);
  }, []);

  const selectedBrowser = browsers.find((b) => b.packageName === settings.browserPackage);
  const browserLabel = settings.browserPackage
    ? // A previously chosen browser that is no longer installed should say so rather than silently
      // showing a stale name while links open somewhere else.
      (selectedBrowser?.label ?? `${browserDisplayName(settings.browserPackage)} (not installed)`)
    : 'System default';

  const browserItems: ActionSheetItem[] = [
    {
      key: 'default',
      label: settings.browserPackage === null ? '✓  System default' : 'System default',
      icon: Globe,
      onPress: () => settings.setBrowserPackage(null),
    },
    ...browsers.map((browser) => ({
      key: browser.packageName,
      label:
        (settings.browserPackage === browser.packageName ? '✓  ' : '') +
        browser.label +
        (browser.isSystemDefault ? '  · default' : ''),
      icon: Globe,
      onPress: () => settings.setBrowserPackage(browser.packageName),
    })),
  ];
  const healthSweep = useHealthSweep();
  const extractionSweep = useExtractionSweep();

  const runExtraction = async () => {
    const result = await extractionSweep.mutateAsync();
    haptics.success();
    Alert.alert(
      'Article text',
      result.attempted === 0
        ? 'Every link has already been through extraction.'
        : `Saved ${result.extracted} of ${result.attempted} for offline reading.` +
            (result.extracted < result.attempted
              ? '\n\nPages that yield nothing are usually videos, apps, or login-walled.'
              : ''),
    );
  };

  const runHealthCheck = async () => {
    const result = await healthSweep.mutateAsync();
    haptics.success();
    Alert.alert(
      'Link check',
      result.checked === 0
        ? 'Every link has been checked recently.'
        : `Checked ${result.checked} links. ${result.broken} appear broken.` +
            (result.recovered > 0 ? `\n${result.recovered} have an archived copy available.` : ''),
    );
  };

  const reschedule = async (reminders: ReminderSettings) => {
    await notificationService.cancelAllReminders();
    if (reminders.dailyEnabled) {
      await notificationService.scheduleDailyReminder(reminders.dailyHour, reminders.dailyMinute);
    }
    if (reminders.weeklyEnabled) {
      await notificationService.scheduleWeeklyReminder(
        reminders.weeklyWeekday,
        reminders.weeklyHour,
        reminders.weeklyMinute,
      );
    }
  };

  const toggleReminder = async (patch: Partial<ReminderSettings>, enabling: boolean) => {
    if (enabling) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        Alert.alert(
          'Notifications off',
          'Enable notifications for LinkVault in your device settings to use reminders.',
        );
        return;
      }
    }
    const next = { ...settings.reminders, ...patch };
    settings.setReminders(patch);
    await reschedule(next);
  };

  const runImport = async (format: importExportService.ImportFormat) => {
    try {
      const result = await importExportService.importLinks(format);
      if (!result) return;
      invalidate();
      haptics.success();
      Alert.alert(
        'Import complete',
        `${result.inserted} added, ${result.skipped} skipped (duplicates or invalid).`,
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unknown error.');
    }
  };

  const runExport = async (format: importExportService.ExportFormat) => {
    try {
      const result = await importExportService.exportLinks(format);
      if (!result.shared) {
        Alert.alert('Export ready', `Saved ${result.count} links, but sharing is unavailable here.`);
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error.');
    }
  };

  const runBackup = async () => {
    try {
      const { shared } = await backupService.createBackup();
      if (!shared) Alert.alert('Backup created', 'Sharing is unavailable on this device.');
    } catch (error) {
      Alert.alert('Backup failed', error instanceof Error ? error.message : 'Unknown error.');
    }
  };

  const runRestore = () => {
    Alert.alert(
      'Restore backup',
      'This replaces all current links, folders, and tags. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await backupService.pickAndRestoreBackup();
              if (!result) return;
              invalidate();
              haptics.success();
              Alert.alert(
                'Backup restored',
                `${result.links} links, ${result.folders} folders, ${result.tags} tags` +
                  (result.highlights > 0 ? `, ${result.highlights} highlights.` : '.'),
              );
            } catch (error) {
              Alert.alert('Restore failed', error instanceof Error ? error.message : 'Invalid file.');
            }
          },
        },
      ],
    );
  };

  const importItems: ActionSheetItem[] = [
    {
      key: 'shared',
      label: 'Shared list or folder',
      icon: ClipboardPaste,
      onPress: () => router.push('/bulk-add'),
    },
    { key: 'csv', label: 'CSV file', icon: FileText, onPress: () => runImport('csv') },
    { key: 'json', label: 'JSON file', icon: FileJson, onPress: () => runImport('json') },
    { key: 'html', label: 'Browser bookmarks (HTML)', icon: Globe, onPress: () => runImport('html') },
  ];

  const exportItems: ActionSheetItem[] = [
    { key: 'csv', label: 'CSV', icon: FileText, onPress: () => runExport('csv') },
    { key: 'json', label: 'JSON', icon: FileJson, onPress: () => runExport('json') },
    { key: 'markdown', label: 'Markdown', icon: FileText, onPress: () => runExport('markdown') },
  ];

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen edges={['top']}>
      <Header title="Settings" large />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 48 }}>
        {/* Appearance */}
        <Animated.View entering={riseIn(0)} className="gap-3">
          <Text variant="label" className="px-1">
            Appearance
          </Text>
          <View className="gap-1.5">
            <Text variant="caption" className="px-1">
              Theme
            </Text>
            <SegmentedControl<ThemePreference>
              value={settings.theme}
              onChange={settings.setTheme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </View>
          <View className="gap-1.5">
            <Text variant="caption" className="px-1">
              Default view
            </Text>
            <SegmentedControl<ViewMode>
              value={settings.viewMode}
              onChange={settings.setViewMode}
              options={[
                { value: 'list', label: 'List', icon: List },
                { value: 'grid', label: 'Grid', icon: Grid2x2 },
              ]}
            />
          </View>
        </Animated.View>

        {/* Behavior */}
        <Animated.View entering={riseIn(1)} className="gap-3">
          <Text variant="label" className="px-1">
            Behavior
          </Text>
          <ListGroup>
            {/* These two settings interact, and the pairing is not obvious: "in app" is a stripped
                Custom Tab (no tabs or address bar) rendered by the chosen browser's engine, while
                turning it off launches that browser's real app. The subtitles say so out loud. */}
            <ListRow
              icon={BookOpen}
              title="Open links in app"
              subtitle={
                settings.openInApp
                  ? 'Quick preview — turn off to open the full browser app'
                  : 'Opens the full browser app'
              }
              showChevron={false}
              right={<Switch value={settings.openInApp} onValueChange={settings.setOpenInApp} />}
            />
            {Platform.OS === 'android' ? (
              <ListRow
                icon={Globe}
                title="Browser"
                subtitle={
                  settings.openInApp
                    ? 'Engine behind the in-app preview'
                    : 'Which browser app opens your links'
                }
                value={browserLabel}
                onPress={() => browserSheet.current?.present()}
              />
            ) : null}
            <ListRow
              icon={Import}
              title="Clipboard monitoring"
              subtitle="Suggest saving copied links"
              showChevron={false}
              right={
                <Switch
                  value={settings.clipboardMonitoring}
                  onValueChange={settings.setClipboardMonitoring}
                />
              }
            />
            <ListRow
              icon={Fingerprint}
              title="Haptics"
              showChevron={false}
              right={
                <Switch value={settings.hapticsEnabled} onValueChange={settings.setHapticsEnabled} />
              }
            />
            <ListRow
              icon={Trash}
              title="Confirm before delete"
              showChevron={false}
              right={
                <Switch
                  value={settings.confirmBeforeDelete}
                  onValueChange={settings.setConfirmBeforeDelete}
                />
              }
            />
          </ListGroup>
        </Animated.View>

        {/* Reminders */}
        <Animated.View entering={riseIn(2)} className="gap-3">
          <Text variant="label" className="px-1">
            Reminders
          </Text>
          <ListGroup>
            <ListRow
              icon={Bell}
              title="Daily reminder"
              subtitle="Every day at 9:00"
              showChevron={false}
              right={
                <Switch
                  value={settings.reminders.dailyEnabled}
                  onValueChange={(v) => toggleReminder({ dailyEnabled: v }, v)}
                />
              }
            />
            <ListRow
              icon={CalendarClock}
              title="Weekly review"
              subtitle="Mondays at 9:00"
              showChevron={false}
              right={
                <Switch
                  value={settings.reminders.weeklyEnabled}
                  onValueChange={(v) => toggleReminder({ weeklyEnabled: v }, v)}
                />
              }
            />
          </ListGroup>
        </Animated.View>

        {/* Archive & link health */}
        <Animated.View entering={riseIn(3)} className="gap-3">
          <Text variant="label" className="px-1">
            Archive &amp; link health
          </Text>
          <ListGroup>
            <ListRow
              icon={BookOpenText}
              title="Save articles offline"
              subtitle="Store article text so links stay readable and searchable"
              showChevron={false}
              right={
                <Switch
                  value={settings.autoExtractArticles}
                  onValueChange={settings.setAutoExtractArticles}
                />
              }
            />
            <ListRow
              icon={ShieldCheck}
              title="Check links for rot"
              subtitle="Periodically re-check saved links"
              showChevron={false}
              right={
                <Switch value={settings.autoCheckLinks} onValueChange={settings.setAutoCheckLinks} />
              }
            />
            <ListRow
              icon={RefreshCw}
              title={extractionSweep.isPending ? 'Fetching articles…' : 'Fetch article text now'}
              subtitle={
                extractionSweep.progress
                  ? `${extractionSweep.progress.done} of ${extractionSweep.progress.total}`
                  : health.data
                    ? `${health.data.readable} of ${health.data.total} saved offline`
                    : undefined
              }
              onPress={extractionSweep.isPending ? undefined : () => runExtraction()}
            />
            <ListRow
              icon={Unlink}
              title={healthSweep.isPending ? 'Checking links…' : 'Check links now'}
              subtitle={
                healthSweep.progress
                  ? `${healthSweep.progress.done} of ${healthSweep.progress.total}`
                  : health.data
                    ? `${health.data.checked} checked · ${health.data.broken} need attention`
                    : undefined
              }
              onPress={healthSweep.isPending ? undefined : () => runHealthCheck()}
            />
          </ListGroup>
        </Animated.View>

        {/* Data */}
        <Animated.View entering={riseIn(4)} className="gap-3">
          <Text variant="label" className="px-1">
            Data
          </Text>
          <ListGroup>
            <ListRow
              icon={Download}
              title="Import"
              subtitle="A shared list, CSV, JSON, or browser bookmarks"
              onPress={() => importSheet.current?.present()}
            />
            <ListRow
              icon={Upload}
              title="Export"
              subtitle="CSV, JSON, or Markdown"
              onPress={() => exportSheet.current?.present()}
            />
            <ListRow
              icon={DatabaseBackup}
              title="Create backup"
              subtitle="Save a full JSON snapshot"
              onPress={runBackup}
            />
            <ListRow
              icon={DatabaseBackup}
              title="Restore backup"
              subtitle="Replace all data from a backup"
              onPress={runRestore}
            />
          </ListGroup>
        </Animated.View>

        {/* About */}
        <Animated.View entering={riseIn(5)} className="gap-3">
          <Text variant="label" className="px-1">
            About
          </Text>
          <ListGroup>
            <ListRow icon={Info} title="Version" value={version} showChevron={false} />
            <ListRow
              icon={ShieldCheck}
              title="Privacy"
              subtitle="Your data never leaves your device"
              onPress={() =>
                Alert.alert(
                  'Privacy',
                  'LinkVault stores everything locally on your device. There are no accounts, servers, or analytics. Metadata is fetched directly from the sites you save.',
                )
              }
            />
          </ListGroup>
          <Text variant="caption" className="px-1 text-center">
            LinkVault · {APP_TAGLINE}
          </Text>
        </Animated.View>
      </ScrollView>

      <ActionSheet ref={browserSheet} title="Open links with" items={browserItems} />
      <ActionSheet ref={importSheet} title="Import from" items={importItems} />
      <ActionSheet ref={exportSheet} title="Export as" items={exportItems} />
    </Screen>
  );
}
