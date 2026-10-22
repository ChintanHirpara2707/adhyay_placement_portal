import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme/design';
import { useLoadingStore } from '@/store/loadingStore';

/**
 * 3px bar at the very top of the screen. While something is pending it rushes to ~80% and then creeps
 * (it never reaches 100% by itself); when loading finishes it completes to 100% and fades out.
 * Mounted once in the root layout. All timing rules (150ms before showing, 400ms minimum, 10s cap) live
 * in loadingStore.
 */
export const TopProgressBar: React.FC = () => {
  const phase = useLoadingStore((s) => s.phase);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(opacity);
    if (phase === 'running') {
      opacity.value = 1;
      progress.value = 0;
      progress.value = reduceMotion
        ? 0.8
        : withSequence(
            withTiming(0.8, { duration: 600, easing: Easing.out(Easing.cubic) }),
            withTiming(0.95, { duration: 9000, easing: Easing.out(Easing.quad) })
          );
    } else if (phase === 'finishing') {
      progress.value = withTiming(1, { duration: reduceMotion ? 0 : 180 });
      opacity.value = withDelay(reduceMotion ? 150 : 200, withTiming(0, { duration: 250 }));
    } else {
      opacity.value = 0;
      progress.value = 0;
    }
  }, [phase, reduceMotion, progress, opacity]);

  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%`, opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      aria-busy={phase === 'running'}
      aria-hidden={phase === 'idle'}
      style={[styles.bar, { top: Platform.OS === 'web' ? 0 : insets.top }, style]}
    />
  );
};

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, height: 3, backgroundColor: C.navy, zIndex: 9999 },
});
