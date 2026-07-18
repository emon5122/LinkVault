import { Clock } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function ReadLaterScreen() {
  return (
    <LinkCollectionScreen
      scope={{ type: 'readLater' }}
      title="Read Later"
      emptyIcon={Clock}
      emptyTitle="Nothing to read"
      emptyMessage="Links you mark as Read Later will appear here."
    />
  );
}
