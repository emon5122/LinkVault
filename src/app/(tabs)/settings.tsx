import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';
import {
  BookOpen,
  Bell,
  CalendarClock,
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
  ShieldCheck,
  Trash,
  Upload,
} from 'lucide-react-native';
import { useRef } from 'react';
import { Alert, ScrollView, View } from 'react-native';

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
import { APP_TAGLINE } from '@/constants/config';
import { useInvalidateLibrary } from '@/hooks';
import { backupService, importExportService, notificationService } from '@/services';
import {
  useSettingsStore,
  type ReminderSettings,
  type ThemePreference,
  type ViewMode,
} from '@/store';
import { haptics } from '@/utils/haptics';

export default function SettingsScreen() {
  const invalidate = useInvalidateLibrary();
  const importSheet = useRef<BottomSheetModal>(null);
  const exportSheet = useRef<BottomSheetModal>(null);

  const settings = useSettingsStore();

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
                `${result.links} links, ${result.folders} folders, ${result.tags} tags.`,
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
    <Screen>
      <Header title="Settings" large />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 48 }}>
        {/* Appearance */}
        <View className="gap-3">
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
        </View>

        {/* Behavior */}
        <View className="gap-3">
          <Text variant="label" className="px-1">
            Behavior
          </Text>
          <ListGroup>
            <ListRow
              icon={BookOpen}
              title="Open links in app"
              subtitle="Use the in-app browser"
              showChevron={false}
              right={<Switch value={settings.openInApp} onValueChange={settings.setOpenInApp} />}
            />
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
        </View>

        {/* Reminders */}
        <View className="gap-3">
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
        </View>

        {/* Data */}
        <View className="gap-3">
          <Text variant="label" className="px-1">
            Data
          </Text>
          <ListGroup>
            <ListRow
              icon={Download}
              title="Import"
              subtitle="CSV, JSON, or browser bookmarks"
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
        </View>

        {/* About */}
        <View className="gap-3">
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
        </View>
      </ScrollView>

      <ActionSheet ref={importSheet} title="Import from" items={importItems} />
      <ActionSheet ref={exportSheet} title="Export as" items={exportItems} />
    </Screen>
  );
}
