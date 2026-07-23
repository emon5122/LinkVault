import { useLocalSearchParams, useRouter } from 'expo-router';
import { FolderOpen, Pencil, Share2, Trash2 } from 'lucide-react-native';
import { Alert } from 'react-native';

import { IconButton } from '@/components/ui';
import { LinkCollectionScreen } from '@/features/links/collection-screen';
import { useDeleteFolder, useFolder, useLinkCount } from '@/hooks';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/format';

export default function FolderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = Number(id);

  const folder = useFolder(folderId);
  const count = useLinkCount({ type: 'folder', folderId });
  const deleteFolder = useDeleteFolder();

  const confirmDelete = () => {
    Alert.alert(
      'Delete folder',
      `Delete “${folder.data?.name ?? 'this folder'}”? The links inside are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFolder.mutate(folderId);
            haptics.success();
            router.back();
          },
        },
      ],
    );
  };

  return (
    <LinkCollectionScreen
      scope={{ type: 'folder', folderId }}
      title={folder.data?.name ?? 'Folder'}
      subtitle={count.data != null ? pluralize(count.data, 'link') : undefined}
      emptyIcon={FolderOpen}
      emptyTitle="Empty folder"
      emptyMessage="Add links to this folder from any link’s edit screen."
      headerRight={
        <>
          <IconButton
            icon={Share2}
            accessibilityLabel="Share folder"
            onPress={() =>
              router.push({ pathname: '/folder-share', params: { id: String(folderId) } })
            }
          />
          <IconButton
            icon={Pencil}
            accessibilityLabel="Edit folder"
            onPress={() =>
              router.push({ pathname: '/folder-edit', params: { id: String(folderId) } })
            }
          />
          <IconButton icon={Trash2} accessibilityLabel="Delete folder" onPress={confirmDelete} />
        </>
      }
    />
  );
}
