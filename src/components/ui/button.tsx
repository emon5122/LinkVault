import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:opacity-90',
  secondary: 'bg-secondary active:opacity-80',
  outline: 'border border-border bg-transparent active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-destructive active:opacity-90',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-xl',
  md: 'h-11 px-4 rounded-2xl',
  lg: 'h-14 px-5 rounded-2xl',
};

const LABEL_SIZE: Record<ButtonSize, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-[15px] font-semibold',
  lg: 'text-base font-semibold',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  fullWidth = false,
  disabled,
  onPress,
  className,
  children,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const iconColor =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'destructive'
        ? colors.destructiveForeground
        : variant === 'secondary'
          ? colors.secondaryForeground
          : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        haptics.light();
        onPress?.(e);
      }}
      className={cn(
        'flex-row items-center justify-center gap-2',
        SIZE[size],
        CONTAINER[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {Icon ? <Icon size={ICON_SIZE[size]} color={iconColor} /> : null}
          {title ? <Text className={cn(LABEL[variant], LABEL_SIZE[size])}>{title}</Text> : null}
          {children}
        </>
      )}
    </Pressable>
  );
}

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: LucideIcon;
  size?: number;
  color?: string;
  variant?: 'plain' | 'muted';
  accessibilityLabel: string;
  className?: string;
}

/** Circular, icon-only pressable for toolbars and list actions. */
export function IconButton({
  icon: Icon,
  size = 22,
  color,
  variant = 'plain',
  onPress,
  className,
  ...props
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={(e) => {
        haptics.light();
        onPress?.(e);
      }}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full active:bg-muted',
        variant === 'muted' && 'bg-muted',
        className,
      )}
      {...props}
    >
      <Icon size={size} color={color ?? colors.foreground} />
    </Pressable>
  );
}
