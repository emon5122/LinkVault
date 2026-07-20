/**
 * Press-scale micro-interaction. Any surface built on this dips slightly toward the finger on
 * touch and springs back on release — the core tactile feel across the app.
 *
 * Two ways to use it:
 *  - `usePressScale()` returns an animated style + press handlers to spread onto an
 *    `AnimatedPressable` (used to retrofit the existing Button/Card/Fab primitives).
 *  - `<PressableScale>` is a drop-in animated Pressable for one-off tappable surfaces.
 *
 * The spring is deliberately snappy and low-bounce (Linear/Raycast character), not springy-cartoonish.
 */
import { forwardRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 20, stiffness: 300, mass: 0.6 } as const;

export function usePressScale(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      scale.value = withSpring(scaleTo, PRESS_SPRING);
    },
    onPressOut: () => {
      scale.value = withSpring(1, PRESS_SPRING);
    },
  };
}

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** How far to scale down on press. Smaller elements read better with a deeper dip. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/** A Pressable that springs on press. Handlers and style compose with anything you pass. */
export const PressableScale = forwardRef<React.ComponentRef<typeof AnimatedPressable>, PressableScaleProps>(
  function PressableScale({ scaleTo = 0.96, onPressIn, onPressOut, style, children, ...props }, ref) {
    const press = usePressScale(scaleTo);
    return (
      <AnimatedPressable
        ref={ref}
        onPressIn={(e) => {
          press.onPressIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          press.onPressOut();
          onPressOut?.(e);
        }}
        style={[press.style, style]}
        {...props}
      >
        {children}
      </AnimatedPressable>
    );
  },
);
