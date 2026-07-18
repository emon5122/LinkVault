import { Star } from 'lucide-react-native';

import { LinkCollectionScreen } from '@/features/links/collection-screen';

export default function FavoritesScreen() {
  return (
    <LinkCollectionScreen
      scope={{ type: 'favorites' }}
      title="Favorites"
      emptyIcon={Star}
      emptyTitle="No favorites yet"
      emptyMessage="Tap the star on any link to add it to your favorites."
    />
  );
}
