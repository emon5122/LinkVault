import { useRouter } from 'expo-router';
import { ClipboardCheck, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useClipboardUrl } from '@/hooks';
import { useTheme } from '@/providers/theme-provider';
import { getDomain } from '@/utils/url';

export interface ClipboardBannerProps {
  /** Extra bottom offset so the banner clears a FAB or tab bar. */
  bottomOffset?: number;
}

/** Floating "Save copied link?" prompt shown when an unsaved URL is on the clipboard. */
export function ClipboardBanner({ bottomOffset = 88 }: ClipboardBannerProps) {
  const { url, dismiss } = useClipboardUrl();
  const { colors } = useTheme();
  const router = useRouter();

  if (!url) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown}
      className="absolute inset-x-4"
      style={{ bottom: bottomOffset }}
    >
      <View
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <ClipboardCheck size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text variant="subtitle" className="text-sm">
            Save copied link?
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {getDomain(url)}
          </Text>
        </View>
        <Button
          title="Save"
          size="sm"
          onPress={() => {
            router.push({ pathname: '/add', params: { url } });
            dismiss();
          }}
        />
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          className="h-8 w-8 items-center justify-center rounded-full active:bg-muted"
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
