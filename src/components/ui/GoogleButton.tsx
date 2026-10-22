import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, R } from '@/theme/design';
import { Spinner } from '@/components/loading/Spinner';

/** The standard multicolour Google "G" (brand colours are fixed by Google's guidelines). */
const GoogleMark: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

/** "or" divider shown between the main submit button and the social button. */
export const OrDivider: React.FC = () => (
  <View style={styles.orRow} aria-hidden>
    <View style={styles.orLine} />
    <Text style={styles.orText}>or</Text>
    <View style={styles.orLine} />
  </View>
);

/** White outlined "Continue with Google" button, same height/radius as the other auth buttons. */
export const GoogleButton: React.FC<{ onPress: () => void; loading?: boolean; disabled?: boolean }> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={loading ? 'Signing in with Google' : 'Continue with Google'}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [styles.btn, disabled && !loading && styles.btnInactive, pressed && !loading && styles.btnPressed]}
    >
      <GoogleMark />
      <Text style={styles.label}>Continue with Google</Text>
      {loading ? (
        // Content stays laid out (just hidden) so the button never changes size.
        <View pointerEvents="none" style={styles.overlay}>
          <Spinner size="sm" />
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  btn: {
    marginTop: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: R.button,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFFFFF',
  },
  btnPressed: { backgroundColor: C.surface },
  btnInactive: { opacity: 0.7 },
  label: { fontSize: 16, fontWeight: '600', color: C.ink },
  overlay: { ...(StyleSheet.absoluteFill as object), alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: R.button },
});
