import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';

import { Text } from './text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className, containerClassName, ...props },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        className={cn(
          'rounded-2xl border border-input bg-card px-4 py-3 text-[15px] text-foreground',
          error ? 'border-destructive' : 'focus:border-primary',
          className,
        )}
        {...props}
      />
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  );
});

/** Multiline variant for notes/descriptions. */
export const TextArea = forwardRef<TextInput, InputProps & { minHeight?: number }>(function TextArea(
  { minHeight = 120, style, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      multiline
      textAlignVertical="top"
      style={[{ minHeight }, style]}
      className="py-3"
      {...props}
    />
  );
});
