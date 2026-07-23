import { useRouter } from 'expo-router';
import { Archive, Clock, Inbox, Pin, Plus, Star, Tag as TagIcon } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FolderTile } from '@/components/folders';
import {
  Chip,
  Header,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useFoldersWithCounts, useLibraryStats, useTagsWithCounts } from '@/hooks';
import { riseIn } from '@/utils/motion';

export default function LibraryScreen() {
  const router = useRouter();
  const stats = useLibraryStats();
  const folders = useFoldersWithCounts();
  const tags = useTagsWithCounts();
  const s = stats.data;

  return (
    <Screen edges={['top']}>
      <Header
        title="Library"
        large
        right={
          <IconButton
            icon={Plus}
            accessibilityLabel="New folder"
            onPress={() => router.push('/folder-edit')}
          />
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Collections */}
        <Animated.View entering={riseIn(0)} className="px-4">
          <ListGroup>
            <ListRow
              icon={Inbox}
              title="All Links"
              value={s ? String(s.totalLinks) : undefined}
              onPress={() => router.push('/all')}
            />
            <ListRow
              icon={Star}
              iconColor="#d97706"
              title="Favorites"
              value={s ? String(s.favorites) : undefined}
              onPress={() => router.push('/favorites')}
            />
            <ListRow
              icon={Clock}
              iconColor="#6366f1"
              title="Read Later"
              value={s ? String(s.readLater) : undefined}
              onPress={() => router.push('/read-later')}
            />
            <ListRow
              icon={Pin}
              iconColor="#7c3aed"
              title="Pinned"
              value={s ? String(s.pinned) : undefined}
              onPress={() => router.push('/pinned')}
            />
            <ListRow
              icon={Archive}
              title="Archive"
              value={s ? String(s.archived) : undefined}
              onPress={() => router.push('/archive')}
            />
          </ListGroup>
        </Animated.View>

        {/* Folders */}
        <Animated.View entering={riseIn(1)} className="mt-6">
          <SectionHeader
            title="Folders"
            actionLabel="New"
            onAction={() => router.push('/folder-edit')}
            className="px-4 pb-3"
          />
          {folders.data && folders.data.length > 0 ? (
            <View className="gap-2 px-4">
              {folders.data.map((folder) => (
                <FolderTile
                  key={folder.id}
                  folder={folder}
                  onPress={() =>
                    router.push({ pathname: '/folder/[id]', params: { id: String(folder.id) } })
                  }
                  onLongPress={() =>
                    router.push({ pathname: '/folder-edit', params: { id: String(folder.id) } })
                  }
                />
              ))}
            </View>
          ) : (
            <Text variant="bodyMuted" className="px-4">
              No folders yet. Create one to organize your links.
            </Text>
          )}
        </Animated.View>

        {/* Tags */}
        <Animated.View entering={riseIn(2)} className="mt-6">
          <SectionHeader
            title="Tags"
            actionLabel="Manage"
            onAction={() => router.push('/tags')}
            className="px-4 pb-3"
          />
          {tags.data && tags.data.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 px-4">
              {tags.data.map((tag) => (
                <Chip
                  key={tag.id}
                  label={`#${tag.name} · ${tag.linkCount}`}
                  icon={TagIcon}
                  onPress={() =>
                    router.push({ pathname: '/tag/[id]', params: { id: String(tag.id) } })
                  }
                />
              ))}
            </View>
          ) : (
            <Text variant="bodyMuted" className="px-4">
              No tags yet. Add tags when you save a link.
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
