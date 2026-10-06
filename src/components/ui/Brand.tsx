import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { C, LOGO_RATIO } from '@/theme/design';

const LOGO = require('@/assets/images/logo.png');

export const Brand: React.FC<{ size?: number; light?: boolean; sub?: string }> = ({
  size = 40,
  light = false,
  sub,
}) => (
  <View style={styles.row}>
    <Image
      source={LOGO}
      style={{ height: size, width: size * LOGO_RATIO }}
      resizeMode="contain"
      accessibilityLabel="Adhyay logo"
    />
    <View style={styles.words}>
      <Text style={[styles.word, light && styles.wordLight]}>Adhyay</Text>
      {sub ? <Text style={[styles.sub, light && styles.subLight]}>{sub}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  words: { gap: 0 },
  word: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.8 },
  wordLight: { color: '#FFFFFF' },
  sub: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  subLight: { color: C.amber },
});
