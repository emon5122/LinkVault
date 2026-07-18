import { View } from 'react-native';

import { cn } from '@/utils/cn';

/** A hairline separator. */
export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-px bg-border', className)} />;
}
