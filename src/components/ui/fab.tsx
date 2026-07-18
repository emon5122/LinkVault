import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { Text } from './text';

export interface FabProps {
  onPress: () => void;
  icon?: LucideIcon;
  label?: string;
  accessibilityLabel?: string;
  className?: string;
  style?: ViewStyle;
}

/** Floating action button, pinned bottom-right by default. Extends to a pill when `label` is set. */
export function Fab({
  onPress,
  icon: Icon = Plus,
  label,
  accessibilityLabel,
  className,
  style,
}: FabProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Add'}
      className={cn(
        'absolute bottom-6 right-5 h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90',
        label ? 'px-5' : 'w-14',
        className,
      )}
      style={[
        {
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        },
        style,
      ]}
    >
      <Icon size={24} color={colors.primaryForeground} />
      {label ? <Text className="font-semibold text-primary-foreground">{label}</Text> : null}
    </Pressable>
  );
}
