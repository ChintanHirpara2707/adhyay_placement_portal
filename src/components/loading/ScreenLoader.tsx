import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '@/theme/design';
import { Spinner } from './Spinner';

/**
 * Full-screen spinner on white. Used only while a sign-in / role resolution is in progress after login or
 * Google sign-in (and for legacy redirect screens). App start is covered by AppIntro instead.
 */
export const ScreenLoader: React.FC = () => (
  <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading" aria-busy>
    <Spinner size="md" />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
});
