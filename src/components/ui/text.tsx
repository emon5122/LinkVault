import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/utils/cn';

export type TextVariant =
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'bodyMuted'
  | 'caption'
  | 'label'
  | 'link';

const VARIANT_CLASS: Record<TextVariant, string> = {
  title: 'text-3xl font-bold text-foreground',
  heading: 'text-xl font-semibold text-foreground',
  subtitle: 'text-base font-semibold text-foreground',
  body: 'text-[15px] leading-5 text-foreground',
  bodyMuted: 'text-[15px] leading-5 text-muted-foreground',
  caption: 'text-xs text-muted-foreground',
  label: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  link: 'text-[15px] text-primary',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
}

/** Typography primitive with named presets. Falls back to `body`. */
export function Text({ variant = 'body', className, ...props }: AppTextProps) {
  return <RNText className={cn(VARIANT_CLASS[variant], className)} {...props} />;
}
