import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';

import { IconButton } from './button';
import { Text } from './text';

export interface ScreenProps {
  children: ReactNode;
  className?: string;
  edges?: Edge[];
}

/** Safe-area screen container with the themed background. */
export function Screen({ children, className, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className={cn('flex-1', className)}>{children}</View>
    </SafeAreaView>
  );
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
  className?: string;
}

/** Consistent navigation header with optional back button and right-side actions. */
export function Header({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  large,
  className,
}: HeaderProps) {
  const router = useRouter();
  return (
    <View className={cn('min-h-[52px] flex-row items-center gap-1 px-3 py-2', className)}>
      {showBack ? (
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => router.back())}
        />
      ) : null}
      <View className={cn('flex-1', showBack ? 'px-1' : 'px-1')}>
        {title ? (
          <Text variant={large ? 'title' : 'heading'} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
    </View>
  );
}
