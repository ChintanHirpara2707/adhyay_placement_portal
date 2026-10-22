import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '@/theme/design';
import { BrandLogo } from '@/components/BrandLogo';
import { Spinner } from './Spinner';

/**
 * Full-screen loader on white: logo above a spinner, nothing else.
 * Only for app start and auth / role resolution - ordinary data loads use skeletons.
 */
export const ScreenLoader: React.FC = () => (
  <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading" aria-busy>
    <BrandLogo size="md" />
    <Spinner size="md" />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 24 },
});
