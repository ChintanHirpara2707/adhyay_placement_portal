import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { C } from '@/theme/design';
import { EmptyState } from '@/components/ui/kit';

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  emptyTitle?: string;
  emptyHint?: string;
}

/** Dependency-free horizontal bar chart: bar width is the value as a % of the largest value. */
export function SimpleBarChart({ data, emptyTitle = 'No placements yet', emptyHint = 'Placements will appear here once students are selected.' }: Props) {
  const rows = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  const max = rows.reduce((m, d) => Math.max(m, d.value), 0);

  if (rows.length === 0 || max <= 0) {
    return <EmptyState icon="chart-bar" title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <View style={styles.wrap} accessibilityRole="list">
      {rows.map((d) => {
        const pct = Math.max((d.value / max) * 100, 2); // tiny bars stay visible
        return (
          <View key={d.label} style={styles.row} accessibilityLabel={`${d.label}: ${d.value}`}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.value}>{d.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 88, fontSize: 13, color: C.inkSoft, fontWeight: '500' },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: C.soft, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 7, backgroundColor: C.accent },
  value: { minWidth: 28, textAlign: 'right', fontSize: 13, fontWeight: '700', color: C.ink },
});
