import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { C, R } from '@/theme/design';
import { useBreakpoint } from '@/components/ui/useBreakpoint';

export interface StatItem {
  label: string;
  value: string | number;
  /** Optional small caption under the label, e.g. "upcoming". */
  sub?: string;
}

/**
 * Read-only dashboard summary: ONE flat card with 2-4 figures separated by thin dividers.
 * Deliberately not interactive (no shadow per stat, no pressed state, no chevron) so it can't be
 * mistaken for a button; real actions are separate button-styled elements below it.
 *
 * Layout: up to 3 figures stay in one row; 4 figures are one row on wide screens and a 2x2 grid below 768px.
 */
export const StatSummary: React.FC<{ items: StatItem[] }> = ({ items }) => {
  const { isMobile } = useBreakpoint();
  const perRow = items.length > 3 && isMobile ? 2 : items.length;

  const rows: StatItem[][] = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));

  return (
    <View style={styles.card} accessibilityRole="summary">
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, r > 0 && styles.rowDivider]}>
          {row.map((item, i) => (
            <View
              key={item.label}
              style={[styles.cell, i > 0 && styles.cellDivider]}
              accessible
              accessibilityLabel={`${item.label}: ${item.value}${item.sub ? `, ${item.sub}` : ''}`}
            >
              <Text style={styles.value} numberOfLines={1}>
                {item.value}
              </Text>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              {item.sub ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {item.sub}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row' },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8, gap: 2 },
  cellDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
  value: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  label: { fontSize: 13, fontWeight: '500', color: C.inkSoft, textAlign: 'center' },
  sub: { fontSize: 12, color: C.muted, textAlign: 'center' },
});
