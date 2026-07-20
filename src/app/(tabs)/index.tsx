import { useRouter } from 'expo-router';
import { Archive, Clock, Inbox, Plus, Star } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HorizontalLinks } from '@/components/home/horizontal-links';
import { QuickTile } from '@/components/home/quick-tile';
import { FolderTile } from '@/components/folders';
import { ClipboardBanner, LinkCard, useLinkActions } from '@/components/links';
import { EmptyState, Fab, Header, Screen, SectionHeader, Text } from '@/components/ui';
import { APP_TAGLINE } from '@/constants/config';
import { useFoldersWithCounts, useLibraryStats, useLinks } from '@/hooks';
import type { Link } from '@/types';
import { riseIn } from '@/utils/motion';

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
            <Animated.View entering={riseIn(0)} className="flex-1">
              <QuickTile
                icon={Star}
                label="Favorites"
                count={s?.favorites}
                color="#d97706"
                onPress={() => router.push('/favorites')}
              />
            </Animated.View>
            <Animated.View entering={riseIn(1)} className="flex-1">
              <QuickTile
                icon={Clock}
                label="Read Later"
                count={s?.readLater}
                color="#6366f1"
                onPress={() => router.push('/read-later')}
              />
            </Animated.View>
            <Animated.View entering={riseIn(2)} className="flex-1">
              <QuickTile
                icon={Archive}
                label="Archive"
                count={s?.archived}
                color="#64748b"
                onPress={() => router.push('/archive')}
              />
            </Animated.View>
          </View>

          {/* Pinned */}
          {pinned.data && pinned.data.length > 0 ? (
            <Animated.View entering={riseIn(3)} className="mt-6">
              <SectionHeader title="Pinned" className="px-4 pb-3" />
              <HorizontalLinks
                links={pinned.data}
                onPressLink={openLink}
                onLongPressLink={actions.present}
              />
            </Animated.View>
          ) : null}

          {/* Folders */}
          {folders.data && folders.data.length > 0 ? (
            <Animated.View entering={riseIn(4)} className="mt-6">
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
            </Animated.View>
          ) : null}

          {/* Recent */}
          <Animated.View entering={riseIn(5)} className="mt-6">
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
          </Animated.View>

          {/* Recently opened */}
          {recentlyOpened.data && recentlyOpened.data.length > 0 ? (
            <Animated.View entering={riseIn(6)} className="mt-6">
              <SectionHeader title="Recently opened" className="px-4 pb-3" />
              <HorizontalLinks
                links={recentlyOpened.data}
                onPressLink={openLink}
                onLongPressLink={actions.present}
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      )}

      <Fab icon={Plus} label="Add" accessibilityLabel="Add link" onPress={() => router.push('/add')} />
      <ClipboardBanner bottomOffset={96} />
      {actions.element}
    </Screen>
  );
}
