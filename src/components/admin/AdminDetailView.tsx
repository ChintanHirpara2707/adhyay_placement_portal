import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { Card, StatusChip, pageColumn } from '@/components/ui/kit';
import { C } from '@/theme/design';

export interface DetailField {
  label: string;
  value?: string | null;
  /** Rendered as a tappable link when true and a value exists. */
  link?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  chips?: { label: string; tone?: 'success' | 'danger' | 'warning' | 'accent' | 'muted' }[];
  fields: DetailField[];
  debarred: boolean;
  busy: 'debar' | 'remove' | null;
  onBack: () => void;
  onToggleDebar: () => void;
  onRemove: () => void;
}

/** Full record view with the admin Debar / Remove actions (confirmation is handled by the caller). */
export function AdminDetailView({ title, subtitle, chips, fields, debarred, busy, onBack, onToggleDebar, onRemove }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Button mode="text" icon="arrow-left" onPress={onBack} textColor={C.accent} style={styles.back} compact>
        Back to list
      </Button>
      <Card style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {chips?.length ? (
          <View style={styles.chips}>
            {chips.map((c) => (
              <StatusChip key={c.label} label={c.label} tone={c.tone as any} />
            ))}
          </View>
        ) : null}
        {fields.map((f) => {
          const has = !!f.value && String(f.value).trim() !== '';
          return (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              {has && f.link ? (
                <Text style={styles.link} onPress={() => Linking.openURL(String(f.value))} selectable>
                  {f.value}
                </Text>
              ) : (
                <Text style={has ? styles.value : styles.empty} selectable>
                  {has ? f.value : 'Not provided'}
                </Text>
              )}
            </View>
          );
        })}
      </Card>
      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon={debarred ? 'account-check-outline' : 'account-cancel-outline'}
          onPress={onToggleDebar}
          loading={busy === 'debar'}
          disabled={busy !== null}
          textColor={debarred ? C.accent : C.warning}
          style={styles.btn}
          contentStyle={styles.btnContent}
        >
          {debarred ? 'Undebar' : 'Debar'}
        </Button>
        <Button
          mode="contained"
          icon="delete-outline"
          onPress={onRemove}
          loading={busy === 'remove'}
          disabled={busy !== null}
          buttonColor={C.danger}
          textColor="#FFFFFF"
          style={styles.btn}
          contentStyle={styles.btnContent}
        >
          Remove
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { ...pageColumn(720), paddingTop: 8, paddingBottom: 32, gap: 12 },
  back: { alignSelf: 'flex-start' },
  card: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted },
  value: { fontSize: 15, color: C.ink, lineHeight: 22 },
  empty: { fontSize: 15, color: C.faint },
  link: { fontSize: 15, color: C.accent, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: { flex: 1, minWidth: 140, borderRadius: 10, borderColor: C.line },
  btnContent: { minHeight: 46 },
});
