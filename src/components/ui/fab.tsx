import { Plus, type LucideIcon } from 'lucide-react-native';
import { type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { AnimatedPressable, usePressScale } from './pressable-scale';
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
  const press = usePressScale(0.92);
  return (
    // Wrapper owns the position + the entrance pop; the inner pressable owns the press-scale, so the
    // two transforms never fight over the same node.
    <Animated.View
      entering={ZoomIn.delay(240).springify().damping(14).stiffness(160)}
      className="absolute bottom-6 right-5"
      style={style}
    >
      <AnimatedPressable
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Add'}
        className={cn(
          'h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90',
          label ? 'px-5' : 'w-14',
          className,
        )}
        style={[
          press.style,
          {
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
        ]}
      >
        <Icon size={24} color={colors.primaryForeground} />
        {label ? <Text className="font-semibold text-primary-foreground">{label}</Text> : null}
      </AnimatedPressable>
    </Animated.View>
  );
}
