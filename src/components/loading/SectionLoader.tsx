import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/theme/design';
import { Spinner } from './Spinner';

/** Spinner centred in a content area (for sections that don't suit a skeleton), with an optional one-line label. */
export const SectionLoader: React.FC<{ label?: string; minHeight?: number }> = ({ label, minHeight = 120 }) => (
  <View style={[styles.root, { minHeight }]} accessibilityRole="progressbar" accessibilityLabel={label || 'Loading'} aria-busy>
    <Spinner size="md" />
    {label ? <Text style={styles.label}>{label}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 },
  label: { fontSize: 13, color: C.muted },
});
