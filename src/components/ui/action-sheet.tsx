import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { LucideIcon } from 'lucide-react-native';
import { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { haptics } from '@/utils/haptics';

import { Text } from './text';

export interface ActionSheetItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

export interface ActionSheetProps {
  title?: string;
  items: ActionSheetItem[];
}

function ActionRows({ title, items }: ActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { dismiss } = useBottomSheetModal();

  return (
    <BottomSheetView style={{ paddingBottom: insets.bottom + 12 }}>
      {title ? (
        <Text variant="label" className="px-5 pb-1 pt-2">
          {title}
        </Text>
      ) : null}
      <View className="px-2 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const color = item.destructive ? colors.destructive : colors.foreground;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                haptics.light();
                dismiss();
                item.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3.5 active:bg-muted"
            >
              {Icon ? <Icon size={20} color={color} /> : null}
              <Text
                className="text-[15px] font-medium"
                style={{ color }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheetView>
  );
}

/**
 * A reusable bottom-sheet action menu. Hold a ref and call `ref.current?.present()` to open it.
 * Must be rendered inside the app's `BottomSheetModalProvider` (see `AppProviders`).
 */
export const ActionSheet = forwardRef<BottomSheetModal, ActionSheetProps>(function ActionSheet(
  props,
  ref,
) {
  const { colors } = useTheme();
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <ActionRows {...props} />
    </BottomSheetModal>
  );
});
