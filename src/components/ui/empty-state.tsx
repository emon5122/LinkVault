import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';

import { Button } from './button';
import { Text } from './text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Friendly placeholder shown when a list/section has no content. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View className={cn('items-center justify-center px-8 py-16', className)}>
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-muted">
        <Icon size={30} color={colors.mutedForeground} />
      </View>
      <Text variant="subtitle" className="mt-4 text-center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodyMuted" className="mt-1.5 text-center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" className="mt-5" />
      ) : null}
    </View>
  );
}
