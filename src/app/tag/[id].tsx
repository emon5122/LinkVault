import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tag as TagIcon, Trash2 } from 'lucide-react-native';
import { Alert } from 'react-native';

import { IconButton } from '@/components/ui';
import { LinkCollectionScreen } from '@/features/links/collection-screen';
import { useDeleteTag, useLinkCount, useTag } from '@/hooks';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/format';

export default function TagScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tagId = Number(id);

  const tag = useTag(tagId);
  const count = useLinkCount({ type: 'tag', tagId });
  const deleteTag = useDeleteTag();

  const confirmDelete = () => {
    Alert.alert('Delete tag', `Delete “#${tag.data?.name ?? 'tag'}”? The links are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTag.mutate(tagId);
          haptics.success();
          router.back();
        },
      },
    ]);
  };

  return (
    <LinkCollectionScreen
      scope={{ type: 'tag', tagId }}
      title={tag.data ? `#${tag.data.name}` : 'Tag'}
      subtitle={count.data != null ? pluralize(count.data, 'link') : undefined}
      emptyIcon={TagIcon}
      emptyTitle="No links with this tag"
      emptyMessage="Assign this tag to links from any link’s edit screen."
      headerRight={
        <IconButton icon={Trash2} accessibilityLabel="Delete tag" onPress={confirmDelete} />
      }
    />
  );
}
