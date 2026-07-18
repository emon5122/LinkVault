import { ScrollView, View } from 'react-native';

import { LinkCard } from '@/components/links/link-card';
import type { Link } from '@/types';

export interface HorizontalLinksProps {
  links: Link[];
  onPressLink: (link: Link) => void;
  onLongPressLink: (link: Link) => void;
}

/** A horizontally-scrolling carousel of grid link cards, used by Home sections. */
export function HorizontalLinks({ links, onPressLink, onLongPressLink }: HorizontalLinksProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {links.map((link) => (
        <View key={link.id} style={{ width: 220 }}>
          <LinkCard
            link={link}
            variant="grid"
            onPress={() => onPressLink(link)}
            onLongPress={() => onLongPressLink(link)}
          />
        </View>
      ))}
    </ScrollView>
  );
}
