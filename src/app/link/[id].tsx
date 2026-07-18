import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  Clock,
  Copy,
  ExternalLink,
  FileWarning,
  MoreVertical,
  Pencil,
  Pin,
  Share2,
  Star,
} from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { LinkThumbnail, useLinkActions } from '@/components/links';
import {
  Button,
  Chip,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Markdown,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { getFolderIcon } from '@/constants/icons';
import { useLinkDetail, useRecordOpen, useSetLinkFlag } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { browserService } from '@/services';
import { useSettingsStore } from '@/store';
import { formatDateTime, formatRelativeTime, pluralize } from '@/utils/format';
import { getDomain } from '@/utils/url';
import { haptics } from '@/utils/haptics';

function ToggleChip({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: typeof Star;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return <Chip label={label} icon={Icon} selected={active} onPress={onPress} accessibilityLabel={label} />;
}

export default function LinkDetailScreen() {
  const router = useRouter();
  const { name } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const linkId = Number(id);

  const detail = useLinkDetail(linkId);
  const setFlag = useSetLinkFlag();
  const recordOpen = useRecordOpen();
  const actions = useLinkActions();
  const openInApp = useSettingsStore((s) => s.openInApp);

  const link = detail.data;

  const open = (inApp: boolean) => {
    if (!link) return;
    recordOpen.mutate(link.id);
    browserService.openLink(link.url, { inApp, theme: name });
  };

  if (detail.isLoading) {
    return (
      <Screen>
        <Header showBack />
        <View className="gap-3 p-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </View>
      </Screen>
    );
  }

  if (!link) {
    return (
      <Screen>
        <Header showBack />
        <EmptyState icon={FileWarning} title="Link not found" message="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        showBack
        right={
          <>
            <IconButton
              icon={Share2}
              accessibilityLabel="Share"
              onPress={() => browserService.shareUrl(link.url, link.title)}
            />
            <IconButton
              icon={Pencil}
              accessibilityLabel="Edit"
              onPress={() => router.push({ pathname: '/add', params: { id: String(link.id) } })}
            />
            <IconButton
              icon={MoreVertical}
              accessibilityLabel="More actions"
              onPress={() => actions.present(link)}
            />
          </>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
        {link.image || link.favicon ? (
          <LinkThumbnail variant="cover" image={link.image} favicon={link.favicon} />
        ) : null}

        <View className="gap-1">
          <Text variant="title" className="text-2xl">
            {link.title}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <LinkThumbnail favicon={link.favicon} size={18} className="rounded" />
            <Text variant="caption" numberOfLines={1} className="flex-1">
              {link.siteName || getDomain(link.url)} · {formatRelativeTime(link.createdAt)}
            </Text>
          </View>
        </View>

        <Button
          title={openInApp ? 'Open link' : 'Open in browser'}
          icon={ExternalLink}
          size="lg"
          onPress={() => open(openInApp)}
        />

        {/* Quick toggles */}
        <View className="flex-row flex-wrap gap-2">
          <ToggleChip
            icon={Star}
            label="Favorite"
            active={link.favorite}
            onPress={() => setFlag.mutate({ id: link.id, flag: 'favorite', value: !link.favorite })}
          />
          <ToggleChip
            icon={Clock}
            label="Read Later"
            active={link.readLater}
            onPress={() => setFlag.mutate({ id: link.id, flag: 'readLater', value: !link.readLater })}
          />
          <ToggleChip
            icon={Pin}
            label="Pin"
            active={link.pinned}
            onPress={() => setFlag.mutate({ id: link.id, flag: 'pinned', value: !link.pinned })}
          />
          <ToggleChip
            icon={link.archived ? ArchiveRestore : Archive}
            label={link.archived ? 'Restore' : 'Archive'}
            active={link.archived}
            onPress={() => setFlag.mutate({ id: link.id, flag: 'archived', value: !link.archived })}
          />
        </View>

        {/* URL (tap to copy) */}
        <View className="rounded-2xl border border-border bg-card p-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="caption" numberOfLines={1} className="flex-1">
              {link.url}
            </Text>
            <IconButton
              icon={Copy}
              size={18}
              accessibilityLabel="Copy link"
              onPress={() => {
                browserService.copyToClipboard(link.url);
                haptics.success();
              }}
            />
          </View>
        </View>

        {link.description ? (
          <View className="gap-1">
            <Text variant="label">Description</Text>
            <Text variant="body">{link.description}</Text>
          </View>
        ) : null}

        {link.notes ? (
          <View className="gap-1.5">
            <Text variant="label">Notes</Text>
            <View className="rounded-2xl border border-border bg-card p-3">
              <Markdown
                content={link.notes}
                onLinkPress={(href) => browserService.openLink(href, { inApp: openInApp, theme: name })}
              />
            </View>
          </View>
        ) : null}

        {link.folders.length > 0 ? (
          <View className="gap-2">
            <Text variant="label">Folders</Text>
            <View className="flex-row flex-wrap gap-2">
              {link.folders.map((folder) => (
                <Chip
                  key={folder.id}
                  label={folder.name}
                  icon={getFolderIcon(folder.icon)}
                  dotColor={folder.color}
                  onPress={() =>
                    router.push({ pathname: '/folder/[id]', params: { id: String(folder.id) } })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {link.tags.length > 0 ? (
          <View className="gap-2">
            <Text variant="label">Tags</Text>
            <View className="flex-row flex-wrap gap-2">
              {link.tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={`#${tag.name}`}
                  onPress={() =>
                    router.push({ pathname: '/tag/[id]', params: { id: String(tag.id) } })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Metadata */}
        <View className="gap-2 rounded-2xl border border-border bg-card p-3">
          <MetaRow label="Saved" value={formatDateTime(link.createdAt)} />
          <Divider />
          <MetaRow label="Updated" value={formatDateTime(link.updatedAt)} />
          <Divider />
          <MetaRow
            label="Opened"
            value={
              link.lastOpenedAt
                ? `${pluralize(link.visitCount, 'time')} · last ${formatRelativeTime(link.lastOpenedAt)}`
                : 'Never'
            }
          />
        </View>
      </ScrollView>

      {actions.element}
    </Screen>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="caption">{label}</Text>
      <Text variant="body" className="text-sm">
        {value}
      </Text>
    </View>
  );
}
