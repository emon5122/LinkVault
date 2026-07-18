import { FlashList } from '@shopify/flash-list';
import { Archive, Star } from 'lucide-react-native';
import { useCallback, type ReactElement } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/providers/theme-provider';
import type { Link } from '@/types';

import { LinkCard } from './link-card';
import { SwipeableRow } from './swipeable-row';

export interface LinkListProps {
  links: Link[];
  variant?: 'list' | 'grid';
  query?: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isFetchingNextPage?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onPressLink: (link: Link) => void;
  onLongPressLink?: (link: Link) => void;
  onToggleFavorite?: (link: Link) => void;
  onArchive?: (link: Link) => void;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
}

function ListSkeleton() {
  return (
    <View className="gap-2.5 px-4 pt-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} className="flex-row gap-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="h-[46px] w-[46px]" />
          <View className="flex-1 gap-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function LinkList({
  links,
  variant = 'list',
  query,
  isLoading,
  isRefreshing,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  onPressLink,
  onLongPressLink,
  onToggleFavorite,
  onArchive,
  ListHeaderComponent,
  ListEmptyComponent,
}: LinkListProps) {
  const { colors } = useTheme();
  const isGrid = variant === 'grid';
  const swipeEnabled = !isGrid && (onToggleFavorite || onArchive);

  const renderItem = useCallback(
    ({ item }: { item: Link }) => {
      const card = (
        <LinkCard
          link={item}
          variant={variant}
          query={query}
          onPress={() => onPressLink(item)}
          onLongPress={onLongPressLink ? () => onLongPressLink(item) : undefined}
        />
      );

      if (isGrid) {
        return <View className="flex-1 p-1.5">{card}</View>;
      }

      if (swipeEnabled) {
        return (
          <View className="px-4 py-1">
            <View className="overflow-hidden rounded-2xl">
              <SwipeableRow
                left={
                  onToggleFavorite
                    ? {
                        icon: Star,
                        label: item.favorite ? 'Unstar' : 'Favorite',
                        color: '#ffffff',
                        background: colors.warning,
                        onTrigger: () => onToggleFavorite(item),
                      }
                    : undefined
                }
                right={
                  onArchive
                    ? {
                        icon: Archive,
                        label: item.archived ? 'Restore' : 'Archive',
                        color: '#ffffff',
                        background: colors.mutedForeground,
                        onTrigger: () => onArchive(item),
                      }
                    : undefined
                }
              >
                {card}
              </SwipeableRow>
            </View>
          </View>
        );
      }

      return <View className="px-4 py-1">{card}</View>;
    },
    [variant, query, isGrid, swipeEnabled, onPressLink, onLongPressLink, onToggleFavorite, onArchive, colors],
  );

  if (isLoading && links.length === 0) {
    return (
      <>
        {ListHeaderComponent}
        <ListSkeleton />
      </>
    );
  }

  return (
    <FlashList
      key={variant}
      data={links}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      numColumns={isGrid ? 2 : 1}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: isGrid ? 10 : 0 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.mutedForeground}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-6">
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        ) : (
          <View className="h-6" />
        )
      }
    />
  );
}
