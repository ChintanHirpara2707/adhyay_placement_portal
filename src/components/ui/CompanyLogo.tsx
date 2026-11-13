import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { C } from '@/theme/design';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

/** Company logo with an initials fallback (no logo yet, or the image failed to load). */
export function CompanyLogo({ uri, name, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const box = { width: size, height: size, borderRadius: Math.round(size * 0.22) };
  if (uri && !failed) {
    return (
      <View style={[styles.box, box]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `${name} logo` : 'Company logo'}
        />
      </View>
    );
  }
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || 'C';
  return (
    <View style={[styles.box, styles.fallback, box]}>
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.42) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: C.accentSoft },
  initial: { color: C.accentStrong, fontWeight: '700' },
});
