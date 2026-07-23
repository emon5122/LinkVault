import { BookOpenText } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function ReadableScreen() {
  return (
    <LinkCollectionScreen
      scope={{ type: 'readable' }}
      title="Saved to read offline"
      subtitle="Article text stored on this device"
      emptyIcon={BookOpenText}
      emptyTitle="Nothing saved offline yet"
      emptyMessage="Article text is fetched in the background. You can also fetch one from a link's reader."
    />
  );
}
