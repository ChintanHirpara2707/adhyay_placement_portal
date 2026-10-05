import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
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
import { Theme } from '@/theme/theme';
import { SHOWCASE_COMPANIES } from '@/constants/showcaseCompanies';

type MarqueeItem =
  | { kind: 'text'; name: string }
  | { kind: 'logo'; name: string; logo: number };

export const PartnerMarquee: React.FC = () => {
  const [dbNames, setDbNames] = useState<string[]>([]);
  const [halfWidth, setHalfWidth] = useState(0);
  const offset = useSharedValue(0);

  const fetchApprovedCompanies = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('company_name')
        .eq('approved', true)
        .limit(10);
      setDbNames(((data as any[]) ?? []).map((c) => c.company_name).filter(Boolean));
    } catch {
      setDbNames([]);
    }
  }, []);

  useEffect(() => {
    fetchApprovedCompanies();
  }, [fetchApprovedCompanies]);

  const startScroll = useCallback(
    (from?: number) => {
      if (halfWidth <= 0) return;
      offset.value = from ?? 0;
      offset.value = withRepeat(
        withTiming(-halfWidth, { duration: Math.max(halfWidth * 25, 4000), easing: Easing.linear }),
        -1,
        false
      );
    },
    [halfWidth, offset]
  );

  useEffect(() => {
    startScroll(0);
  }, [halfWidth, startScroll]);

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

  return (
    <View
      style={styles.viewport}
      onTouchStart={() => cancelAnimation(offset)}
      onTouchEnd={() => startScroll(offset.value)}
    >
      <Animated.View
        style={[styles.row, animatedStyle]}
        onLayout={(e) => {
          const half = e.nativeEvent.layout.width / 2;
          if (half > 0 && Math.abs(half - halfWidth) > 1) setHalfWidth(half);
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
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  badge: {
    height: 64,
    minWidth: 120,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: Theme.colors.primaryText },
  logo: { height: 60, width: 110 },
  fallback: { fontSize: 14, color: Theme.colors.secondaryText, textAlign: 'center', paddingVertical: 12 },
});
