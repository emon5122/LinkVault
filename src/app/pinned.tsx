import { Pin } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function PinnedScreen() {
  return (
    <LinkCollectionScreen
      scope={{ type: 'pinned' }}
      title="Pinned"
      emptyIcon={Pin}
      emptyTitle="No pinned links"
      emptyMessage="Pin important links to keep them within reach."
    />
  );
}
