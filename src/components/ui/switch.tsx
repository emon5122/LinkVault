import { Switch as RNSwitch, type SwitchProps } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { haptics } from '@/utils/haptics';

/** Theme-aware wrapper over the platform Switch with a haptic tick on change. */
export function Switch({ value, onValueChange, ...props }: SwitchProps) {
  const { colors, isDark } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={(next) => {
        haptics.selection();
        onValueChange?.(next);
      }}
      trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary }}
      thumbColor={colors.background}
      ios_backgroundColor={isDark ? '#334155' : '#cbd5e1'}
      {...props}
    />
  );
}
