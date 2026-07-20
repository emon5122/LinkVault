import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { PressableCard } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

export interface QuickTileProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  color: string;
  onPress: () => void;
}

/** Small stat tile used in the Home "quick access" row. */
export function QuickTile({ icon: Icon, label, count, color, onPress }: QuickTileProps) {
  return (
    <PressableCard
      onPress={onPress}
      // `w-full` (not `flex-1`) because Home wraps each tile in a flex-1 Animated.View for the
      // staggered entrance; the tile fills that wrapper rather than competing with it for flex.
      className="w-full gap-2 p-3"
      accessibilityRole="button"
      accessibilityLabel={`${label}${count != null ? `, ${count}` : ''}`}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={18} color={color} />
      </View>
      <View>
        {count != null ? (
          <Text variant="subtitle" className="text-lg">
            {count}
          </Text>
        ) : null}
        <Text variant="caption" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableCard>
  );
}
