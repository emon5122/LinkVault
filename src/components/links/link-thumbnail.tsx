import { Image } from 'expo-image';
import { Globe } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/utils/cn';

export interface LinkThumbnailProps {
  favicon?: string | null;
  image?: string | null;
  /** 'favicon' = small square icon (list rows); 'cover' = wide preview image (grid/detail). */
  variant?: 'favicon' | 'cover';
  size?: number;
  className?: string;
}

/**
 * Displays a link's preview image or favicon with a graceful fallback (a globe glyph) when the
 * image is missing or fails to load. Uses expo-image for caching + fade-in.
 */
export function LinkThumbnail({
  favicon,
  image,
  variant = 'favicon',
  size = 44,
  className,
}: LinkThumbnailProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const source = variant === 'cover' ? (image ?? favicon) : (favicon ?? image);
  const showFallback = !source || failed;

  if (variant === 'cover') {
    return (
      <View className={cn('overflow-hidden rounded-xl bg-muted', className)}>
        {showFallback ? (
          <View className="aspect-[16/9] w-full items-center justify-center bg-muted">
            <Globe size={28} color={colors.mutedForeground} />
          </View>
        ) : (
          <Image
            source={{ uri: source! }}
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            contentFit="cover"
            transition={150}
            onError={() => setFailed(true)}
          />
        )}
      </View>
    );
  }

  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-xl bg-muted', className)}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <Globe size={size * 0.5} color={colors.mutedForeground} />
      ) : (
        <Image
          source={{ uri: source! }}
          style={{ width: size * 0.62, height: size * 0.62 }}
          contentFit="contain"
          transition={150}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
