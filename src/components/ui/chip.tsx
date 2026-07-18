import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** Optional dot color (used for folder chips). */
  dotColor?: string;
  className?: string;
  accessibilityLabel?: string;
}

/** Compact selectable pill for tags, folders, and filters. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  dotColor,
  className,
  accessibilityLabel,
}: ChipProps) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={
        onPress
          ? () => {
              haptics.selection();
              onPress();
            }
          : undefined
      }
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border px-3 py-1.5',
        selected ? 'border-primary bg-primary' : 'border-border bg-secondary',
        className,
      )}
    >
      {dotColor ? (
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}
      {Icon ? (
        <Icon size={14} color={selected ? colors.primaryForeground : colors.mutedForeground} />
      ) : null}
      <Text
        className={cn(
          'text-sm font-medium',
          selected ? 'text-primary-foreground' : 'text-secondary-foreground',
        )}
      >
        {label}
      </Text>
    </Wrapper>
  );
}
