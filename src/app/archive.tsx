import { Archive, Trash2 } from 'lucide-react-native';
import { Alert } from 'react-native';

import { IconButton } from '@/components/ui';
import { LinkCollectionScreen } from '@/features/links/collection-screen';
import { useEmptyArchive } from '@/hooks';
import { haptics } from '@/utils/haptics';

export default function ArchiveScreen() {
  const emptyArchive = useEmptyArchive();

  const confirmEmpty = () => {
    Alert.alert('Empty archive', 'Permanently delete all archived links? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: () => {
          emptyArchive.mutate();
          haptics.success();
        },
      },
    ]);
  };

  return (
    <LinkCollectionScreen
      scope={{ type: 'archive' }}
      title="Archive"
      emptyIcon={Archive}
      emptyTitle="Archive is empty"
      emptyMessage="Archived links are hidden from your lists but kept here until you delete them."
      headerRight={
        <IconButton icon={Trash2} accessibilityLabel="Empty archive" onPress={confirmEmpty} />
      }
    />
  );
}
