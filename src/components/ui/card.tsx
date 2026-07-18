import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

export interface CardProps extends ViewProps {
  className?: string;
}

/** Rounded surface with a hairline border and soft elevation. */
export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-2xl border border-border bg-card p-4', className)}
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
      {...props}
    />
  );
}

export interface PressableCardProps extends Omit<PressableProps, 'children'> {
  className?: string;
  children?: React.ReactNode;
  hapticOnPress?: boolean;
}

/** A Card that reacts to touch — used for link rows and navigation tiles. */
export function PressableCard({
  className,
  onPress,
  onLongPress,
  hapticOnPress = true,
  children,
  ...props
}: PressableCardProps) {
  return (
    <Pressable
      onPress={(e) => {
        if (hapticOnPress) haptics.light();
        onPress?.(e);
      }}
      onLongPress={(e) => {
        haptics.medium();
        onLongPress?.(e);
      }}
      className={cn(
        'rounded-2xl border border-border bg-card active:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
