import { Inbox } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function AllLinksScreen() {
  return (
    <LinkCollectionScreen
      scope={{ type: 'all' }}
      title="All Links"
      emptyIcon={Inbox}
      emptyTitle="No links yet"
      emptyMessage="Everything you save will show up here."
    />
  );
}
