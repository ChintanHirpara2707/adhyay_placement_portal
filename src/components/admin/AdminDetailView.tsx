import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { formatDateTime } from '@/lib/format';
import type { DebarHistoryRow } from '@/lib/adminManage';
import { Button } from '@/components/ui/AppButton';
import { Card, StatusChip, pageColumn } from '@/components/ui/kit';
import { C } from '@/theme/design';
import { openResume } from '@/lib/resume';
import { showAlert } from '@/lib/alert';

export interface DetailField {
  label: string;
  value?: string | null;
  /** Rendered as a tappable link when true and a value exists. */
  link?: boolean;
  /** Value is a resume reference: open it through a signed URL (or the old http link) instead of showing the raw path. */
  resume?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  chips?: { label: string; tone?: 'success' | 'danger' | 'warning' | 'accent' | 'muted' }[];
  fields: DetailField[];
  debarred: boolean;
  /** Current reason, shown while debarred (the student sees the same text at sign-in). */
  debarReason?: string | null;
  /** Debar / undebar log, newest first. `null` = still loading, `'error'` = failed to load. */
  history?: DebarHistoryRow[] | null | 'error';
  busy: 'debar' | 'remove' | null;
  onBack: () => void;
  /** Called with the typed reason when debarring (required, min 3 chars) and with '' when undebarring. */
  onToggleDebar: (reason: string) => void;
  onRemove: () => void;
}

/** Full record view with the admin Debar / Remove actions (confirmation is handled by the caller). */
export function AdminDetailView({ title, subtitle, chips, fields, debarred, debarReason, history, busy, onBack, onToggleDebar, onRemove }: Props) {
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [debarred, title]);

  const handleToggle = () => {
    if (debarred) {
      onToggleDebar('');
      return;
    }
    if (reason.trim().length < 3) {
      showAlert('Reason required', 'Enter a short reason for debarring. It is shown to the user when they try to sign in.');
      return;
    }
    onToggleDebar(reason.trim());
  };

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
              {has && f.resume ? (
                <Text
                  style={styles.link}
                  onPress={() =>
                    openResume(f.value).catch((e) => showAlert('Could not open resume', e?.message || 'Try again.'))
                  }
                >
                  {/^https?:\/\//i.test(String(f.value)) ? f.value : 'Open PDF resume'}
                </Text>
              ) : has && f.link ? (
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

      {debarred && debarReason ? (
        <View style={styles.reasonBanner}>
          <Text style={styles.reasonLabel}>DEBARRED — REASON</Text>
          <Text style={styles.reasonText} selectable>
            {debarReason}
          </Text>
        </View>
      ) : null}

      {!debarred ? (
        <TextInput
          mode="outlined"
          label="Reason for debarring (required)"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          multiline
          style={styles.reasonInput}
          outlineColor={C.line}
          activeOutlineColor={C.accent}
        />
      ) : null}

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon={debarred ? 'account-check-outline' : 'account-cancel-outline'}
          onPress={handleToggle}
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

      {history !== undefined ? (
        <Card style={styles.card}>
          <Text style={styles.label}>Debar history</Text>
          {history === null ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : history === 'error' ? (
            <Text style={styles.errorText}>Could not load the history.</Text>
          ) : history.length === 0 ? (
            <Text style={styles.empty}>Never debarred.</Text>
          ) : (
            history.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <StatusChip label={h.action === 'debarred' ? 'Debarred' : 'Undebarred'} tone={h.action === 'debarred' ? 'danger' : 'success'} />
                <View style={styles.historyText}>
                  <Text style={styles.value}>{h.reason || (h.action === 'debarred' ? 'No reason recorded' : 'Restriction lifted')}</Text>
                  <Text style={styles.historyDate}>{formatDateTime(h.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
      ) : null}
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
  reasonBanner: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, gap: 4 },
  reasonLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: C.danger },
  reasonText: { fontSize: 14, color: C.ink, lineHeight: 20 },
  reasonInput: { backgroundColor: C.card, fontSize: 15 },
  errorText: { fontSize: 14, color: C.danger },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  historyText: { flex: 1, minWidth: 0, gap: 2 },
  historyDate: { fontSize: 12, color: C.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: { flex: 1, minWidth: 140, borderRadius: 10, borderColor: C.line },
  btnContent: { minHeight: 46 },
});
