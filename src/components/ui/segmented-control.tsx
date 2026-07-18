import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { Text } from './text';

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** iOS-style segmented control. Works with text labels, icons, or both. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View className={cn('flex-row rounded-2xl bg-muted p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              haptics.selection();
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label ?? option.value}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2',
              selected && 'bg-card',
            )}
            style={
              selected
                ? {
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : undefined
            }
          >
            {Icon ? (
              <Icon size={16} color={selected ? colors.foreground : colors.mutedForeground} />
            ) : null}
            {option.label ? (
              <Text
                className={cn(
                  'text-sm font-medium',
                  selected ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {option.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
