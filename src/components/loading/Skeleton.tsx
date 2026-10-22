import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { C, R } from '@/theme/design';

/** Placeholder bar with a soft highlight sweeping across it (static when reduced motion is on). */
export const Skeleton: React.FC<{
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width = '100%', height = 16, borderRadius = 6, style }) => {
  const reduceMotion = useReducedMotion();
  const [w, setW] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (!reduceMotion) progress.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-w * 0.6, w]) }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[styles.bar, { width, height, borderRadius }, style]}
      aria-hidden
    >
      {!reduceMotion && w > 0 ? <Animated.View style={[styles.band, { width: w * 0.6 }, band]} /> : null}
    </View>
  );
};

export type SkeletonVariant = 'job' | 'application' | 'interview' | 'notification' | 'stat';

/** One card-shaped placeholder. Shapes mirror the real cards (same padding, radius, row layout) so nothing jumps. */
export const SkeletonCard: React.FC<{ variant?: SkeletonVariant }> = ({ variant = 'job' }) => {
  if (variant === 'stat') {
    return (
      <View style={styles.statCard}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.statCell, i > 0 && styles.statDivider]}>
            <Skeleton width={36} height={26} borderRadius={6} />
            <Skeleton width={64} height={12} />
          </View>
        ))}
      </View>
    );
  }
  if (variant === 'notification') {
    return (
      <View style={[styles.card, styles.cardCompact]}>
        <Skeleton width="92%" height={14} />
        <Skeleton width="60%" height={14} />
        <Skeleton width={72} height={10} style={{ marginTop: 4 }} />
      </View>
    );
  }
  if (variant === 'interview') {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Skeleton width="62%" height={18} />
          <Skeleton width={64} height={22} borderRadius={999} />
        </View>
        <Skeleton width="40%" height={14} />
        <Skeleton width="55%" height={13} />
        <Skeleton width="48%" height={14} />
      </View>
    );
  }
  if (variant === 'application') {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Skeleton width="60%" height={18} />
          <Skeleton width={84} height={22} borderRadius={999} />
        </View>
        <Skeleton width="38%" height={14} />
        <View style={styles.row}>
          <Skeleton width={74} height={22} borderRadius={999} />
          <Skeleton width={96} height={12} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width="62%" height={18} />
        <Skeleton width={54} height={22} borderRadius={999} />
      </View>
      <Skeleton width="38%" height={14} />
      <View style={styles.chips}>
        <Skeleton width={78} height={24} borderRadius={999} />
        <Skeleton width={128} height={24} borderRadius={999} />
      </View>
    </View>
  );
};

/** `count` placeholder cards stacked with the same 12px gap the real lists use. */
export const SkeletonList: React.FC<{ count?: number; variant?: SkeletonVariant }> = ({ count = 3, variant = 'job' }) => (
  <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Loading" aria-busy>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} variant={variant} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  bar: { backgroundColor: C.line, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.6)' },
  list: { gap: 12 },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  cardCompact: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  statCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 20 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
});
