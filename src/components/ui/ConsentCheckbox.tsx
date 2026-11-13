import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { C } from '@/theme/design';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: string;
}

/** "I agree to the Terms of Use and Privacy Policy" with both documents one tap away. */
export function ConsentCheckbox({ checked, onChange, error }: Props) {
  const nav = useSafeNavigate();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => onChange(!checked)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
          hitSlop={8}
          style={styles.box}
        >
          <MaterialCommunityIcons
            name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={error && !checked ? C.danger : checked ? C.accent : C.muted}
          />
        </TouchableOpacity>
        <Text style={styles.text}>
          I agree to the{' '}
          <Text style={styles.link} onPress={() => nav.push('/legal?tab=terms' as any)} accessibilityRole="link">
            Terms of Use
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => nav.push('/legal?tab=privacy' as any)} accessibilityRole="link">
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
      {error && !checked ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 22, color: C.inkSoft, paddingTop: 2 },
  link: { color: C.accent, fontWeight: '600', textDecorationLine: 'underline' },
  error: { color: C.danger, fontSize: 12, marginTop: 4, marginLeft: 34 },
});
