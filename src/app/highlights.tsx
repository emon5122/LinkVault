/** Every highlight in the library, newest first, grouped by the link it came from. */
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Highlighter, Trash2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { LinkThumbnail } from '@/components/links';
import { EmptyState, Header, IconButton, Screen, Text } from '@/components/ui';
import { useAllHighlights, useDeleteHighlight } from '@/hooks';
import type { HighlightWithLink } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { getDomain } from '@/utils/url';
import { haptics } from '@/utils/haptics';

const TINTS: Record<string, string> = {
  yellow: 'rgba(250, 204, 21, 0.38)',
  green: 'rgba(34, 197, 94, 0.30)',
  blue: 'rgba(59, 130, 246, 0.30)',
  pink: 'rgba(236, 72, 153, 0.30)',
};

type Row =
  | { kind: 'header'; key: string; link: HighlightWithLink['link']; count: number }
  | { kind: 'highlight'; key: string; highlight: HighlightWithLink };

/** Flatten highlights into a header-per-link + one row per highlight list. */
function toRows(highlights: HighlightWithLink[]): Row[] {
  const rows: Row[] = [];
  let currentLinkId: number | null = null;

  for (const highlight of highlights) {
    if (highlight.linkId !== currentLinkId) {
      currentLinkId = highlight.linkId;
      const count = highlights.filter((h) => h.linkId === currentLinkId).length;
      rows.push({
        kind: 'header',
        key: `h-${highlight.linkId}-${highlight.id}`,
        link: highlight.link,
        count,
      });
    }
    rows.push({ kind: 'highlight', key: `q-${highlight.id}`, highlight });
  }
  return rows;
}

export default function HighlightsScreen() {
  const router = useRouter();
  const query = useAllHighlights();
  const remove = useDeleteHighlight();

  const rows = useMemo(() => toRows(query.data ?? []), [query.data]);

  if (!query.isLoading && rows.length === 0) {
    return (
      <Screen>
        <Header title="Highlights" showBack />
        <EmptyState
          icon={Highlighter}
          title="No highlights yet"
          message="Open a saved article in the reader and tap a sentence to highlight it."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Highlights" subtitle={`${query.data?.length ?? 0} saved`} showBack />
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Pressable
                className="mb-2 mt-4 flex-row items-center gap-2 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.link.title} in the reader`}
                onPress={() =>
                  router.push({ pathname: '/reader/[id]', params: { id: String(item.link.id) } })
                }
              >
                <LinkThumbnail favicon={item.link.favicon} size={20} className="rounded" />
                <View className="flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {item.link.title}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {getDomain(item.link.url)} · {item.count} highlighted
                  </Text>
                </View>
              </Pressable>
            );
          }

          const { highlight } = item;
          return (
            <View className="mb-2 flex-row items-start gap-2 rounded-2xl border border-border bg-card p-3">
              <View
                className="mt-1 h-full w-1 rounded-full"
                style={{ backgroundColor: TINTS[highlight.color] ?? TINTS.yellow }}
              />
              <View className="flex-1 gap-1">
                <Text variant="body" className="text-[15px] leading-6">
                  {highlight.text}
                </Text>
                <Text variant="caption">{formatRelativeTime(highlight.createdAt)}</Text>
              </View>
              <IconButton
                icon={Trash2}
                size={18}
                accessibilityLabel="Delete highlight"
                onPress={() => {
                  haptics.light();
                  remove.mutate(highlight.id);
                }}
              />
            </View>
          );
        }}
      />
    </Screen>
  );
}
