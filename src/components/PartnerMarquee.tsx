import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { C, R } from '@/theme/design';
import { SHOWCASE_COMPANIES } from '@/constants/showcaseCompanies';

type MarqueeItem =
  | { kind: 'text'; name: string }
  | { kind: 'logo'; name: string; logo: number };

/** Scroll speed: one pixel every 25 ms (40 px/s). A loop never runs faster than 4 s. */
const MS_PER_PX = 25;
const MIN_LOOP_MS = 4000;
/** Space between badges. A per-badge margin (not the row's `gap`) so the doubled row is exactly two periods wide. */
const BADGE_SPACING = 12;

export const PartnerMarquee: React.FC = () => {
  const [dbNames, setDbNames] = useState<string[]>([]);
  // Width of ONE full set of badges, trailing spacing included = the distance after which the row repeats.
  const [period, setPeriod] = useState(0);
  const offset = useSharedValue(0);

  const fetchApprovedCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('company_name')
        .eq('approved', true)
        .limit(10);
      if (error) throw error;
      setDbNames(((data as any[]) ?? []).map((c) => c.company_name).filter(Boolean));
    } catch (e) {
      // Decorative only: fall back to "New companies joining soon", but say why in development.
      if (__DEV__) console.warn('[PartnerMarquee] could not load approved companies:', e);
      setDbNames([]);
    }
  }, []);

  useEffect(() => {
    fetchApprovedCompanies();
  }, [fetchApprovedCompanies]);

  /** Scroll left forever, resuming from `from` at the normal speed (the first pass only covers what is left). */
  const startScroll = useCallback(
    (from = 0) => {
      if (period <= 0) return;
      cancelAnimation(offset);
      const loopMs = Math.max(period * MS_PER_PX, MIN_LOOP_MS);
      const loop = () => withRepeat(withTiming(-period, { duration: loopMs, easing: Easing.linear }), -1, false);
      const start = from <= 0 && from > -period ? from : 0;
      if (start === 0) {
        offset.value = 0;
        offset.value = loop();
        return;
      }
      offset.value = start;
      const remainingMs = (loopMs * (period + start)) / period;
      offset.value = withTiming(-period, { duration: remainingMs, easing: Easing.linear }, (finished) => {
        if (!finished) return;
        offset.value = 0;
        offset.value = withRepeat(withTiming(-period, { duration: loopMs, easing: Easing.linear }), -1, false);
      });
    },
    [period, offset]
  );

  useEffect(() => {
    startScroll(0);
    return () => cancelAnimation(offset);
  }, [startScroll, offset]);

  const pause = useCallback(() => cancelAnimation(offset), [offset]);
  const resume = useCallback(() => startScroll(offset.value), [startScroll, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const items: MarqueeItem[] = [
    ...dbNames.map((n) => ({ kind: 'text' as const, name: n })),
    ...SHOWCASE_COMPANIES.map((s) => ({ kind: 'logo' as const, name: s.name, logo: s.logo })),
  ];

  if (items.length < 3) {
    return <Text style={styles.fallback}>New companies joining soon</Text>;
  }

  const doubled = [...items, ...items];
  // Pause while the pointer is over the strip (web only; these props are not part of the native View types).
  const hoverProps = Platform.OS === 'web' ? ({ onMouseEnter: pause, onMouseLeave: resume } as any) : {};

  return (
    <View
      style={styles.viewport}
      onTouchStart={pause}
      onTouchEnd={resume}
      onTouchCancel={resume}
      {...hoverProps}
    >
      <Animated.View
        style={[styles.row, animatedStyle]}
        onLayout={(e) => {
          // Two identical sets, each badge followed by BADGE_SPACING, so half the row is exactly one period.
          const next = e.nativeEvent.layout.width / 2;
          if (next > 0 && Math.abs(next - period) > 1) setPeriod(next);
        }}
      >
        {doubled.map((item, i) => (
          <View key={`${item.name}-${i}`} style={styles.badge}>
            {item.kind === 'logo' ? (
              <Image source={item.logo} style={styles.logo} resizeMode="contain" accessibilityLabel={item.name} />
            ) : (
              <Text style={styles.badgeText}>{item.name}</Text>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden', paddingVertical: 4 },
  // No `gap` here: spacing lives on each badge (see BADGE_SPACING) so the loop has no seam.
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    height: 64,
    minWidth: 120,
    marginRight: BADGE_SPACING,
    paddingHorizontal: 16,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: C.ink },
  logo: { height: 60, width: 110 },
  fallback: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 12 },
});
