import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C } from '@/theme/design';
import { formatLongDate, formatTime, fromHM, fromYMD, toHM, toYMD } from '@/lib/dates';
import { DateFieldProps, TimeFieldProps } from './dateFieldTypes';

type Mode = 'date' | 'time';

function useNativePicker(mode: Mode, current: Date, onPicked: (d: Date) => void, minimumDate?: Date) {
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      // Android uses the imperative dialog API.
      DateTimePickerAndroid.open({
        value: current,
        mode,
        minimumDate,
        is24Hour: false,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onPicked(d);
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  const iosPicker =
    Platform.OS === 'ios' && iosOpen ? (
      <View style={styles.iosPicker}>
        <DateTimePicker
          value={current}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          minimumDate={minimumDate}
          themeVariant="light"
          onChange={(_e: DateTimePickerEvent, d?: Date) => d && onPicked(d)}
        />
        <Text style={styles.done} onPress={() => setIosOpen(false)} accessibilityRole="button">
          Done
        </Text>
      </View>
    ) : null;

  return { open, iosPicker };
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** iOS / Android: tap the field to open the system calendar. The chosen day shows as "21 Dec 2026". */
export const DateField: React.FC<DateFieldProps> = ({ label, value, onChange, minimumDate, optional, error, placeholder }) => {
  const min = minimumDate ?? startOfToday();
  const current = fromYMD(value) ?? (min.getTime() > Date.now() ? min : new Date());
  const { open, iosPicker } = useNativePicker('date', current, (d) => onChange(toYMD(d)), min);
  const text = formatLongDate(value);

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
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text || 'not set'}. Opens calendar`}
        style={[styles.field, !!error && styles.fieldError]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={C.muted} />
        <Text style={[styles.value, !text && styles.placeholder]}>{text || placeholder || 'Select date'}</Text>
      </Pressable>
      {iosPicker}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

/** iOS / Android time picker, value "HH:MM". */
export const TimeField: React.FC<TimeFieldProps> = ({ label, value, onChange, error, placeholder }) => {
  const current = fromHM(value) ?? new Date();
  const { open, iosPicker } = useNativePicker('time', current, (d) => onChange(toHM(d)));
  const text = formatTime(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text || 'not set'}. Opens time picker`}
        style={[styles.field, !!error && styles.fieldError]}
      >
        <MaterialCommunityIcons name="clock-outline" size={20} color={C.muted} />
        <Text style={[styles.value, !text && styles.placeholder]}>{text || placeholder || 'Select time'}</Text>
      </Pressable>
      {iosPicker}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: C.ink },
  optional: { fontWeight: '400', color: C.muted },
  clear: { fontSize: 13, fontWeight: '600', color: C.accent, paddingVertical: 4, paddingHorizontal: 4 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  fieldError: { borderColor: C.danger },
  value: { fontSize: 16, color: C.ink },
  placeholder: { color: C.muted },
  error: { fontSize: 12, color: C.danger, marginTop: 2 },
  iosPicker: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 8, alignItems: 'stretch' },
  done: { alignSelf: 'flex-end', fontSize: 15, fontWeight: '600', color: C.accent, padding: 10 },
});
