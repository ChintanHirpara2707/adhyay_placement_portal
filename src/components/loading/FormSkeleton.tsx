import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, R } from '@/theme/design';
import { Skeleton } from './Skeleton';

/**
 * Placeholder for form-style screens (profiles): `cards` bordered sections, each with a title and
 * `fields` label + input pairs, matching the real cards' padding and spacing.
 */
export const FormSkeleton: React.FC<{ cards?: number; fields?: number; withHeader?: boolean }> = ({
  cards = 3,
  fields = 2,
  withHeader = false,
}) => (
  <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading" aria-busy>
    {withHeader ? (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Skeleton width={60} height={60} borderRadius={30} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="50%" height={18} />
            <Skeleton width="70%" height={13} />
          </View>
        </View>
        <Skeleton height={44} borderRadius={10} />
      </View>
    ) : null}
    {Array.from({ length: cards }, (_, c) => (
      <View key={c} style={styles.card}>
        <Skeleton width="42%" height={16} />
        {Array.from({ length: fields }, (_, f) => (
          <View key={f} style={styles.field}>
            <Skeleton width="30%" height={12} />
            <Skeleton height={50} borderRadius={10} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  field: { gap: 8 },
});
