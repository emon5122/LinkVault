import { useRouter } from 'expo-router';
import { Archive, Clock, Inbox, Plus, Star } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { HorizontalLinks } from '@/components/home/horizontal-links';
import { QuickTile } from '@/components/home/quick-tile';
import { FolderTile } from '@/components/folders';
import { ClipboardBanner, LinkCard, useLinkActions } from '@/components/links';
import { EmptyState, Fab, Header, Screen, SectionHeader, Text } from '@/components/ui';
import { APP_TAGLINE } from '@/constants/config';
import { useFoldersWithCounts, useLibraryStats, useLinks } from '@/hooks';
import type { Link } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const actions = useLinkActions();

  const stats = useLibraryStats();
  const pinned = useLinks({ scope: { type: 'pinned' }, limit: 12 });
  const recent = useLinks({ scope: { type: 'recent' }, sort: 'createdDesc', limit: 10 });
  const recentlyOpened = useLinks({ scope: { type: 'recentlyOpened' }, limit: 12 });
  const folders = useFoldersWithCounts();

  const openLink = (link: Link) =>
    router.push({ pathname: '/link/[id]', params: { id: String(link.id) } });

  const s = stats.data;
  const isEmpty = s != null && s.totalLinks === 0 && s.folders === 0;

  return (
    <Screen>
      <Header title="LinkVault" subtitle={APP_TAGLINE} large />

      {isEmpty ? (
        <EmptyState
          icon={Inbox}
          title="Your vault is empty"
          message="Save your first link to get started. Paste a URL or share one from any app."
          actionLabel="Add a link"
          onAction={() => router.push('/add')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Quick access */}
          <View className="flex-row gap-3 px-4 pt-1">
            <QuickTile
              icon={Star}
              label="Favorites"
              count={s?.favorites}
              color="#d97706"
              onPress={() => router.push('/favorites')}
            />
            <QuickTile
              icon={Clock}
              label="Read Later"
              count={s?.readLater}
              color="#2563eb"
              onPress={() => router.push('/read-later')}
            />
            <QuickTile
              icon={Archive}
              label="Archive"
              count={s?.archived}
              color="#71717a"
              onPress={() => router.push('/archive')}
            />
          </View>

          {/* Pinned */}
          {pinned.data && pinned.data.length > 0 ? (
            <View className="mt-6">
              <SectionHeader title="Pinned" className="px-4 pb-3" />
              <HorizontalLinks
                links={pinned.data}
                onPressLink={openLink}
                onLongPressLink={actions.present}
              />
            </View>
          ) : null}

          {/* Folders */}
          {folders.data && folders.data.length > 0 ? (
            <View className="mt-6">
              <SectionHeader
                title="Folders"
                actionLabel="All"
                onAction={() => router.push('/library')}
                className="px-4 pb-3"
              />
              <View className="gap-2 px-4">
                {folders.data.slice(0, 4).map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    onPress={() =>
                      router.push({ pathname: '/folder/[id]', params: { id: String(folder.id) } })
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Recent */}
          <View className="mt-6">
            <SectionHeader
              title="Recent"
              actionLabel="All links"
              onAction={() => router.push('/library')}
              className="px-4 pb-3"
            />
            {recent.data && recent.data.length > 0 ? (
              <View className="gap-2 px-4">
                {recent.data.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onPress={() => openLink(link)}
                    onLongPress={() => actions.present(link)}
                  />
                ))}
              </View>
            ) : (
              <Text variant="bodyMuted" className="px-4">
                No links yet.
              </Text>
            )}
          </View>

          {/* Recently opened */}
          {recentlyOpened.data && recentlyOpened.data.length > 0 ? (
            <View className="mt-6">
              <SectionHeader title="Recently opened" className="px-4 pb-3" />
              <HorizontalLinks
                links={recentlyOpened.data}
                onPressLink={openLink}
                onLongPressLink={actions.present}
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      <Fab icon={Plus} label="Add" accessibilityLabel="Add link" onPress={() => router.push('/add')} />
      <ClipboardBanner bottomOffset={96} />
      {actions.element}
    </Screen>
  );
}
