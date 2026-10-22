import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C } from '@/theme/design';
import { Spinner } from '@/components/loading/Spinner';

/** Style keys that describe the button's own surface; everything else (margin, flex, width...) is layout. */
const SURFACE_KEYS = ['borderRadius', 'borderColor', 'borderWidth', 'backgroundColor', 'elevation'];

/**
 * Drop-in replacement for react-native-paper's Button (same props) with a proper `loading` state:
 *  - a Spinner replaces the label (white on filled buttons, blue on outlined/text ones)
 *  - the button keeps its exact size: the label stays laid out, just invisible
 *  - taps are ignored while loading, and the button keeps its normal colours (no grey flash)
 */
export const Button: React.FC<ButtonProps> = ({
  loading = false,
  disabled,
  onPress,
  mode = 'text',
  icon,
  style,
  labelStyle,
  children,
  ...rest
}) => {
  const filled = mode === 'contained';
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const surface: Record<string, unknown> = {};
  const layout: Record<string, unknown> = {};
  if (flat) {
    for (const [k, v] of Object.entries(flat)) (SURFACE_KEYS.includes(k) ? surface : layout)[k] = v;
  }

  // Keep the icon's space while loading (transparent) so the width never jumps.
  const resolvedIcon =
    typeof icon === 'string'
      ? ({ size, color }: { size: number; color: string }) => (
          <MaterialCommunityIcons name={icon as any} size={size} color={loading ? 'transparent' : color} />
        )
      : icon;

  return (
    <View style={layout as ViewStyle} aria-busy={loading || undefined}>
      <PaperButton
        {...rest}
        mode={mode}
        icon={resolvedIcon as any}
        // While loading, never pass `disabled` through: Paper would repaint the button grey.
        disabled={loading ? false : disabled}
        onPress={loading ? undefined : onPress}
        style={[styles.inner, surface as ViewStyle]}
        labelStyle={[labelStyle, loading && styles.hidden]}
        accessibilityState={{ busy: loading, disabled: loading || !!disabled }}
      >
        {children}
      </PaperButton>
      {loading ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Spinner size="sm" color={filled ? '#FFFFFF' : C.navy} trackColor={filled ? 'rgba(255,255,255,0.35)' : C.line} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inner: { width: '100%' },
  hidden: { opacity: 0 },
  overlay: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center' },
});
