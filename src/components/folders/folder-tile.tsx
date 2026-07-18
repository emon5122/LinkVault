import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';

import { PressableCard } from '@/components/ui/card';
import { FolderGlyph } from '@/components/ui/folder-glyph';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/theme-provider';
import type { FolderWithCount } from '@/types';
import { pluralize } from '@/utils/format';

export interface FolderTileProps {
  folder: FolderWithCount;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function FolderTile({ folder, onPress, onLongPress }: FolderTileProps) {
  const { colors } = useTheme();

  return (
    <PressableCard
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 p-3"
      accessibilityRole="button"
      accessibilityLabel={`${folder.name}, ${pluralize(folder.linkCount, 'link')}`}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${folder.color}22` }}
      >
        <FolderGlyph name={folder.icon} size={22} color={folder.color} />
      </View>
      <View className="flex-1">
        <Text variant="subtitle" numberOfLines={1}>
          {folder.name}
        </Text>
        <Text variant="caption">{pluralize(folder.linkCount, 'link')}</Text>
      </View>
      <ChevronRight size={20} color={colors.mutedForeground} />
    </PressableCard>
  );
}
