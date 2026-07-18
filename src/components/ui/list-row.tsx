import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';
import { haptics } from '@/utils/haptics';

import { Divider } from './divider';
import { Text } from './text';

export interface ListRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

/** A single settings/library row: leading icon, title/subtitle, trailing value or control. */
export function ListRow({
  icon: Icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  value,
  right,
  onPress,
  onLongPress,
  destructive,
  showChevron = true,
}: ListRowProps) {
  const { colors } = useTheme();
  const Wrapper = onPress || onLongPress ? Pressable : View;

  return (
    <Wrapper
      onPress={
        onPress
          ? () => {
              haptics.light();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      className="min-h-[52px] flex-row items-center gap-3 px-4 py-2.5 active:bg-muted"
    >
      {Icon ? (
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBackground ?? colors.muted }}
        >
          <Icon size={18} color={destructive ? colors.destructive : (iconColor ?? colors.foreground)} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text variant="subtitle" className={cn('text-[15px]', destructive && 'text-destructive')}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text variant="bodyMuted">{value}</Text> : null}
      {right}
      {onPress && showChevron && !right ? (
        <ChevronRight size={18} color={colors.mutedForeground} />
      ) : null}
    </Wrapper>
  );
}

/** Card container that renders its row children with hairline dividers between them. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider className="ml-4" /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}
