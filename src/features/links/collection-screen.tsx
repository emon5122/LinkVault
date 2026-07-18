import { useRouter } from 'expo-router';
import { ArrowDownUp, LayoutGrid, List, type LucideIcon } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';

import { ActionSheet, type ActionSheetItem } from '@/components/ui/action-sheet';
import { EmptyState, Header, IconButton, Screen } from '@/components/ui';
import { LinkList, useLinkActions } from '@/components/links';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useInfiniteLinks, useSetLinkFlag } from '@/hooks';
import { useSettingsStore, type ViewMode } from '@/store';
import type { Link, LinkScope, LinkSort } from '@/types';

const SORT_OPTIONS: { key: LinkSort; label: string }[] = [
  { key: 'createdDesc', label: 'Newest first' },
  { key: 'createdAsc', label: 'Oldest first' },
  { key: 'titleAsc', label: 'Title A–Z' },
  { key: 'titleDesc', label: 'Title Z–A' },
  { key: 'mostVisited', label: 'Most visited' },
  { key: 'updatedDesc', label: 'Recently updated' },
];

export interface LinkCollectionScreenProps {
  scope: LinkScope;
  title: string;
  subtitle?: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyMessage?: string;
  headerRight?: ReactNode;
  showViewToggle?: boolean;
  showSort?: boolean;
}

/** Shared screen for any scoped list of links (favorites, folders, tags, archive, …). */
export function LinkCollectionScreen({
  scope,
  title,
  subtitle,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  headerRight,
  showViewToggle = true,
  showSort = true,
}: LinkCollectionScreenProps) {
  const router = useRouter();
  const actions = useLinkActions();
  const setFlag = useSetLinkFlag();
  const sortSheet = useRef<BottomSheetModal>(null);

  const defaultViewMode = useSettingsStore((state) => state.viewMode);
  const defaultSort = useSettingsStore((state) => state.defaultSort);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [sort, setSort] = useState<LinkSort>(defaultSort);

  const query = useInfiniteLinks(scope, sort);

  const openLink = (link: Link) =>
    router.push({ pathname: '/link/[id]', params: { id: String(link.id) } });

  const sortItems: ActionSheetItem[] = SORT_OPTIONS.map((option) => ({
    key: option.key,
    label: option.key === sort ? `✓  ${option.label}` : option.label,
    onPress: () => setSort(option.key),
  }));

  return (
    <Screen>
      <Header
        title={title}
        subtitle={subtitle}
        showBack
        right={
          <>
            {headerRight}
            {showViewToggle ? (
              <IconButton
                icon={viewMode === 'list' ? LayoutGrid : List}
                accessibilityLabel={viewMode === 'list' ? 'Grid view' : 'List view'}
                onPress={() => setViewMode((m) => (m === 'list' ? 'grid' : 'list'))}
              />
            ) : null}
            {showSort ? (
              <IconButton
                icon={ArrowDownUp}
                accessibilityLabel="Sort"
                onPress={() => sortSheet.current?.present()}
              />
            ) : null}
          </>
        }
      />

      <LinkList
        links={query.links}
        variant={viewMode}
        isLoading={query.isLoading}
        isRefreshing={query.isRefetching && !query.isFetchingNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        onRefresh={() => query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onPressLink={openLink}
        onLongPressLink={actions.present}
        onToggleFavorite={(link) =>
          setFlag.mutate({ id: link.id, flag: 'favorite', value: !link.favorite })
        }
        onArchive={(link) =>
          setFlag.mutate({ id: link.id, flag: 'archived', value: !link.archived })
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
          ) : null
        }
      />

      <ActionSheet ref={sortSheet} title="Sort by" items={sortItems} />
      {actions.element}
    </Screen>
  );
}
