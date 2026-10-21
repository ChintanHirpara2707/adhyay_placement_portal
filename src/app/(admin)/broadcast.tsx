import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Text, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, EmptyState, FilterChips } from '@/components/ui/kit';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { BRANCHES } from '@/constants/branches';

export default function AdminBroadcastScreen() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [branch, setBranch] = useState<string>(BRANCHES[0]);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<{ id: string; message: string; created_at: string; count: number }[]>([]);

  const fetchBroadcastHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      showAlert('Could not load history', error.message);
      return;
    }
    // A broadcast stores one row per student; collapse identical messages sent together into one entry.
    const groups = new Map<string, { id: string; message: string; created_at: string; count: number }>();
    for (const n of (data as any[]) ?? []) {
      const key = `${n.message}|${String(n.created_at).slice(0, 16)}`;
      const g = groups.get(key);
      if (g) g.count += 1;
      else groups.set(key, { id: n.id, message: n.message, created_at: n.created_at, count: 1 });
    }
    setHistory(Array.from(groups.values()).slice(0, 15));
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        await fetchBroadcastHistory();
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [fetchBroadcastHistory]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const handleBroadcast = () => {
    const text = message.trim();
    if (!text) {
      showAlert('Empty message', 'Type a message before sending.');
      return;
    }
    const target = audience === 'branch' ? `all ${branch} students` : 'ALL students';
    showAlert('Send broadcast?', `This will notify ${target}. It cannot be unsent.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => sendBroadcast(text) },
    ]);
  };

  const sendBroadcast = async (text: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      let query = supabase.from('students').select('id, branch');
      if (audience === 'branch') query = query.eq('branch', branch);
      const { data: students, error: sError } = await query;
      if (sError) throw sError;
      const ids = ((students as any[]) ?? []).map((s) => s.id);
      if (ids.length === 0) {
        showAlert('No recipients', 'No students match this audience.');
        return;
      }
      const { error: nError } = await supabase
        .from('notifications')
        .insert(ids.map((user_id) => ({ user_id, message: text, read: false })));
      if (nError) throw nError;
      showAlert('Sent', `Broadcast sent to ${ids.length} student${ids.length === 1 ? '' : 's'}.`);
      setMessage('');
      await fetchBroadcastHistory();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to send broadcast.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <View style={styles.shell}>
      <TopNavbar title="Broadcast" subtitle="Notify students" />
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.accent} />}
      >
        <View style={styles.column}>
          <Text style={styles.heading}>Broadcast</Text>
          <Text style={styles.sub}>Send an announcement to students.</Text>
        </View>
        <Card style={styles.column}>
          <SectionHeader title="New announcement" />
          <Text style={styles.label}>Message</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="e.g. TCS interviews start Monday — check your schedule."
            value={message}
            onChangeText={setMessage}
            style={styles.input}
            outlineColor={C.line}
            activeOutlineColor={C.accent}
            outlineStyle={styles.outline}
            maxLength={500}
          />
          <Text style={styles.count}>{message.length}/500</Text>
          <Text style={styles.label}>Target audience</Text>
          <SegmentedButtons
            value={audience}
            onValueChange={setAudience}
            buttons={[{ value: 'all', label: 'All Students' }, { value: 'branch', label: 'Specific Branch' }]}
          />
          {audience === 'branch' ? (
            <FilterChips
              wrap
              value={branch}
              onChange={setBranch}
              options={BRANCHES.map((b) => ({ value: b, label: b }))}
            />
          ) : null}
          <Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={handleBroadcast} buttonColor={C.accent} textColor="#FFFFFF" style={styles.send} contentStyle={styles.sendContent} labelStyle={styles.sendLabel}>
            Send Broadcast
          </Button>
        </Card>

        <View style={styles.column}><SectionHeader title="Recent notifications" /></View>
        <Card style={styles.column}>
          {history.length === 0 ? (
            <EmptyState icon="bullhorn-outline" title="Nothing sent yet" hint="Your broadcasts will appear here." />
          ) : (
            history.map((h) => (
              <ActivityFeedItem
                key={h.id}
                icon="bullhorn-outline"
                message={h.count > 1 ? `${h.message}  (${h.count} recipients)` : h.message}
                timestamp={h.created_at}
              />
            ))
          )}
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  heading: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: C.inkSoft, marginTop: 8 },
  input: { backgroundColor: C.card, fontSize: 16, marginTop: 6 },
  outline: { borderRadius: 10, borderWidth: 1 },
  count: { fontSize: 12, color: C.muted, textAlign: 'right' },
  send: { borderRadius: 10, marginTop: 16 },
  sendContent: { paddingVertical: 8, minHeight: 48 },
  sendLabel: { fontSize: 16, fontWeight: '600' },
});
