import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { C } from '@/theme/design';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export const Field: React.FC<{
  label: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, error, children }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {error ? (
      <HelperText type="error" visible style={styles.error}>
        {error}
      </HelperText>
    ) : null}
  </View>
);

export const authInputProps = {
  mode: 'outlined' as const,
  outlineColor: C.line,
  activeOutlineColor: C.accent,
  outlineStyle: { borderRadius: 14, borderWidth: 1.5 },
};

export const AuthPrimaryButton: React.FC<{
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}> = ({ title, loading, disabled, onPress }) => (
  <AnimatedPressable scaleTo={0.98} style={styles.btnWrap}>
    <Button
      mode="contained"
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      style={styles.btn}
      contentStyle={styles.btnContent}
      labelStyle={styles.btnLabel}
      buttonColor={C.ink}
      textColor="#FFFFFF"
    >
      {title}
    </Button>
  </AnimatedPressable>
);

export const authCardStyles = StyleSheet.create({
  input: { backgroundColor: C.card, fontSize: 16 },
});

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 6 },
  error: { paddingHorizontal: 0, marginTop: 2 },
  btnWrap: { marginTop: 8 },
  btn: { borderRadius: 14 },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 16, fontWeight: '700' },
});
