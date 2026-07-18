import type { LucideIcon } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Text } from '@/components/ui/text';
import { haptics } from '@/utils/haptics';

export interface SwipeAction {
  icon: LucideIcon;
  label: string;
  /** Icon + label color. */
  color: string;
  /** Panel background color. */
  background: string;
  onTrigger: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  left?: SwipeAction;
  right?: SwipeAction;
}

const ACTION_WIDTH = 88;

function SwipeActionPanel({ action, align }: { action: SwipeAction; align: 'left' | 'right' }) {
  const Icon = action.icon;
  return (
    <View
      style={{
        width: ACTION_WIDTH,
        backgroundColor: action.background,
        justifyContent: 'center',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <View style={{ width: ACTION_WIDTH, alignItems: 'center', gap: 4 }}>
        <Icon size={22} color={action.color} />
        <Text className="text-xs font-semibold" style={{ color: action.color }}>
          {action.label}
        </Text>
      </View>
    </View>
  );
}

/** Wraps a row with optional left/right swipe actions that fire when swiped past the threshold. */
export function SwipeableRow({ children, left, right }: SwipeableRowProps) {
  const ref = useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);

  const renderLeft = left ? () => <SwipeActionPanel action={left} align="left" /> : undefined;
  const renderRight = right ? () => <SwipeActionPanel action={right} align="right" /> : undefined;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      leftThreshold={ACTION_WIDTH * 0.7}
      rightThreshold={ACTION_WIDTH * 0.7}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={(direction) => {
        haptics.medium();
        (direction === 'left' ? left : right)?.onTrigger();
        ref.current?.close();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
