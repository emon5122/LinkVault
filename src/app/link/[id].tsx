import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  BookOpenText,
  Clock,
  Copy,
  ExternalLink,
  FileWarning,
  History,
  MoreVertical,
  Pencil,
  Pin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Star,
  Unlink,
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
import {
  useArchiveNow,
  useCheckLink,
  useHighlightCount,
  useLinkDetail,
  useRecordOpen,
  useSetLinkFlag,
} from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { browserService, healthService, readabilityService } from '@/services';
import { useSettingsStore } from '@/store';
import type { LinkStatus } from '@/types';
import { cn } from '@/utils/cn';
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

/** Copy for each health state. `unknown` deliberately avoids claiming the link is dead. */
const HEALTH_COPY: Record<LinkStatus, { label: string; detail: string }> = {
  ok: { label: 'Reachable', detail: 'This link resolved at the last check.' },
  redirected: { label: 'Redirected', detail: 'This link now points somewhere else.' },
  broken: { label: 'Broken', detail: "This link didn't resolve at the last check." },
  unknown: {
    label: "Couldn't verify",
    detail: 'The check failed — the site may block automated requests, or you were offline.',
  },
};

export default function LinkDetailScreen() {
  const router = useRouter();
  const { colors, name } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const linkId = Number(id);

  const detail = useLinkDetail(linkId);
  const setFlag = useSetLinkFlag();
  const recordOpen = useRecordOpen();
  const actions = useLinkActions();
  const checkLink = useCheckLink();
  const archiveNow = useArchiveNow();
  const highlightCount = useHighlightCount(linkId);
  const openInApp = useSettingsStore((s) => s.openInApp);

  const link = detail.data;

  const open = (inApp: boolean) => {
    if (!link) return;
    recordOpen.mutate(link.id);
    // A dead link opens its archived snapshot instead of a 404, when one was found.
    browserService.openLink(healthService.bestOpenUrl(link), { inApp, theme: name });
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

        <View className="gap-2">
          <Button
            title={
              link.status === 'broken' && link.archiveUrl
                ? 'Open archived copy'
                : openInApp
                  ? 'Open link'
                  : 'Open in browser'
            }
            icon={link.status === 'broken' && link.archiveUrl ? History : ExternalLink}
            size="lg"
            onPress={() => open(openInApp)}
          />

          {/* The reader is only worth offering once there's something stored to read. */}
          {link.content ? (
            <Button
              title={
                readabilityService.readingMinutes(link.wordCount)
                  ? `Read offline · ${readabilityService.readingMinutes(link.wordCount)} min`
                  : 'Read offline'
              }
              variant="secondary"
              icon={BookOpenText}
              onPress={() =>
                router.push({ pathname: '/reader/[id]', params: { id: String(link.id) } })
              }
            />
          ) : null}
        </View>

        {/* Health */}
        {link.status ? (
          <View
            className={cn(
              'gap-2 rounded-2xl border p-3',
              link.status === 'broken'
                ? 'border-destructive/40 bg-destructive/10'
                : 'border-border bg-card',
            )}
          >
            <View className="flex-row items-center gap-2">
              {link.status === 'broken' ? (
                <Unlink size={16} color={colors.destructive} />
              ) : (
                <ShieldCheck size={16} color={colors.mutedForeground} />
              )}
              <Text variant="label" className="flex-1">
                {HEALTH_COPY[link.status].label}
              </Text>
              {link.checkedAt ? (
                <Text variant="caption">{formatRelativeTime(link.checkedAt)}</Text>
              ) : null}
            </View>
            <Text variant="caption">{HEALTH_COPY[link.status].detail}</Text>

            <View className="flex-row flex-wrap gap-2 pt-1">
              <Chip
                label={checkLink.isPending ? 'Checking…' : 'Check now'}
                icon={RefreshCw}
                onPress={() => checkLink.mutate(linkId)}
              />
              <Chip
                label={archiveNow.isPending ? 'Archiving…' : 'Save to archive'}
                icon={History}
                onPress={() => archiveNow.mutate(linkId)}
              />
              {link.archiveUrl ? (
                <Chip
                  label="Open snapshot"
                  icon={History}
                  onPress={() =>
                    browserService.openLink(link.archiveUrl as string, {
                      inApp: openInApp,
                      theme: name,
                    })
                  }
                />
              ) : null}
            </View>
          </View>
        ) : null}

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
          {link.wordCount ? (
            <>
              <Divider />
              <MetaRow
                label="Article"
                value={`${pluralize(link.wordCount, 'word')} · ${readabilityService.readingMinutes(link.wordCount)} min`}
              />
            </>
          ) : null}
          {highlightCount.data ? (
            <>
              <Divider />
              <MetaRow label="Highlights" value={pluralize(highlightCount.data, 'passage')} />
            </>
          ) : null}
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
