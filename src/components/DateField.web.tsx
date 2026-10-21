import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/theme/design';
import { toYMD } from '@/lib/dates';
import { DateFieldProps, TimeFieldProps } from './dateFieldTypes';

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: 52,
  boxSizing: 'border-box',
  padding: '0 14px',
  borderRadius: 10,
  border: `1px solid ${hasError ? C.danger : C.line}`,
  backgroundColor: C.card,
  fontSize: 16,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: C.ink,
  outline: 'none',
  cursor: 'pointer',
});

/** Web: the browser calendar via <input type="date">, past days disabled with `min`. */
export const DateField: React.FC<DateFieldProps> = ({ label, value, onChange, minimumDate, optional, error }) => {
  const min = toYMD(minimumDate ?? new Date());
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {optional ? <Text style={styles.optional}> (optional)</Text> : null}
        </Text>
        {optional && value ? (
          <Text style={styles.clear} onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
            Clear
          </Text>
        ) : null}
      </View>
      <input
        type="date"
        value={value}
        min={min}
        aria-label={label}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(!!error)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

/** Web: native time picker via <input type="time">. */
export const TimeField: React.FC<TimeFieldProps> = ({ label, value, onChange, error }) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <input
      type="time"
      value={value}
      aria-label={label}
      aria-invalid={!!error}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle(!!error)}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: C.ink },
  optional: { fontWeight: '400', color: C.muted },
  clear: { fontSize: 13, fontWeight: '600', color: C.accent, paddingVertical: 4, paddingHorizontal: 4 },
  error: { fontSize: 12, color: C.danger, marginTop: 2 },
});
