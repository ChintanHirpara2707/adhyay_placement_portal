import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { C } from '@/theme/design';
import { useBreakpoint } from './useBreakpoint';

export interface Column<T> {
  key: string;
  title: string;
  flex?: number;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  keyOf,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf?: (row: T, i: number) => string;
}) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <View style={styles.stack}>
        {rows.map((row, i) => (
          <View key={keyOf ? keyOf(row, i) : (row.id ?? String(i))} style={styles.card}>
            {columns.map((c) => (
              <View key={c.key} style={styles.pair}>
                <Text style={styles.label}>{c.title}</Text>
                <View style={styles.value}>{c.render(row)}</View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headRow}>
        {columns.map((c) => (
          <Text key={c.key} style={[styles.headCell, { flex: c.flex ?? 1 }]}>
            {c.title}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={keyOf ? keyOf(row, i) : (row.id ?? String(i))} style={styles.bodyRow}>
          {columns.map((c) => (
            <View key={c.key} style={{ flex: c.flex ?? 1, minWidth: 0, flexShrink: 1 }}>
              {c.render(row)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 8 },
  pair: { gap: 2 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', color: C.faint },
  value: { minWidth: 0, flexShrink: 1 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card },
  headRow: { flexDirection: 'row', backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  headCell: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', color: C.amber },
  bodyRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center' },
});
