import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { C } from '@/theme/design';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE: Record<SpinnerSize, { px: number; stroke: number }> = {
  sm: { px: 16, stroke: 2 },
  md: { px: 28, stroke: 3 },
  lg: { px: 44, stroke: 4 },
};

/**
 * Circular ring: a light track with one deep-blue arc rotating linearly (800ms, forever).
 * No bounce, no gradient, one colour. With reduced motion on, the arc is drawn static.
 */
export const Spinner: React.FC<{
  size?: SpinnerSize;
  /** Moving arc colour. Use '#FFFFFF' on primary (filled) buttons. */
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ size = 'md', color = C.navy, trackColor = C.line, style }) => {
  const { px, stroke } = SIZE[size];
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(rotation);
    rotation.value = 0;
    if (!reduceMotion) {
      rotation.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
    }
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation]);

  const arcStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const ring = { width: px, height: px, borderRadius: px / 2, borderWidth: stroke };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      aria-busy
      style={[{ width: px, height: px }, style]}
    >
      <View style={[styles.fill, ring, { borderColor: trackColor }]} />
      <Animated.View style={[styles.fill, ring, { borderColor: 'transparent', borderTopColor: color }, arcStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0 },
});
