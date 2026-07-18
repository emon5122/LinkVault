import { Clock, Pin, Star } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { HighlightedText } from '@/components/ui/highlighted-text';
import { Text } from '@/components/ui/text';
import { PressableCard } from '@/components/ui/card';
import { useTheme } from '@/providers/theme-provider';
import type { Link } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { getDomain } from '@/utils/url';

import { LinkThumbnail } from './link-thumbnail';

export interface LinkCardProps {
  link: Link;
  variant?: 'list' | 'grid';
  query?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

function FlagCluster({ link }: { link: Link }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-1.5">
      {link.readLater ? <Clock size={14} color={colors.mutedForeground} /> : null}
      {link.pinned ? <Pin size={14} color={colors.primary} fill={colors.primary} /> : null}
      {link.favorite ? <Star size={14} color={colors.warning} fill={colors.warning} /> : null}
    </View>
  );
}

function LinkCardComponent({ link, variant = 'list', query, onPress, onLongPress }: LinkCardProps) {
  const host = link.host ?? getDomain(link.url);
  const meta = `${host} · ${formatRelativeTime(link.createdAt)}`;

  if (variant === 'grid') {
    return (
      <PressableCard
        onPress={onPress}
        onLongPress={onLongPress}
        className="flex-1 overflow-hidden"
        accessibilityRole="button"
        accessibilityLabel={link.title}
      >
        <LinkThumbnail variant="cover" image={link.image} favicon={link.favicon} />
        <View className="gap-1 p-3">
          <View className="flex-row items-start justify-between gap-1.5">
            <Text variant="subtitle" numberOfLines={2} className="flex-1 text-sm">
              {link.title}
            </Text>
            <FlagCluster link={link} />
          </View>
          <Text variant="caption" numberOfLines={1}>
            {host}
          </Text>
        </View>
      </PressableCard>
    );
  }

  return (
    <PressableCard
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row gap-3 p-3"
      accessibilityRole="button"
      accessibilityLabel={link.title}
    >
      <LinkThumbnail favicon={link.favicon} image={link.image} size={46} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-start justify-between gap-2">
          {query ? (
            <HighlightedText
              text={link.title}
              query={query}
              numberOfLines={2}
              className="flex-1 font-semibold"
            />
          ) : (
            <Text variant="subtitle" numberOfLines={2} className="flex-1">
              {link.title}
            </Text>
          )}
          <FlagCluster link={link} />
        </View>
        <Text variant="caption" numberOfLines={1}>
          {meta}
        </Text>
        {link.description ? (
          <Text variant="bodyMuted" numberOfLines={1} className="text-sm">
            {link.description}
          </Text>
        ) : null}
      </View>
    </PressableCard>
  );
}

export const LinkCard = memo(LinkCardComponent);
