import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Alert, RefreshControl } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, EmptyState, FilterChips } from '@/components/ui/kit';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';

const BRANCHES = ['CSE', 'IT', 'ECE', 'ME', 'CE', 'EE'];

export default function AdminBroadcastScreen() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [branch, setBranch] = useState('CSE');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const fetchBroadcastHistory = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(15);
    setHistory((data as any[]) ?? []);
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

  const handleBroadcast = async () => {
    const text = message.trim();
    if (!text) {
      Alert.alert('Empty message', 'Type a message before sending.');
      return;
    }
    setSending(true);
    try {
      let query = supabase.from('students').select('id, branch');
      if (audience === 'branch') query = query.eq('branch', branch);
      const { data: students, error: sError } = await query;
      if (sError) throw sError;
      const ids = ((students as any[]) ?? []).map((s) => s.id);
      if (ids.length === 0) {
        Alert.alert('No recipients', 'No students match this audience.');
        return;
      }
      const { error: nError } = await supabase
        .from('notifications')
        .insert(ids.map((user_id) => ({ user_id, message: text, read: false })));
      if (nError) throw nError;
      Alert.alert('Sent', `Broadcast sent to ${ids.length} student${ids.length === 1 ? '' : 's'}.`);
      setMessage('');
      await fetchBroadcastHistory();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send broadcast.');
    } finally {
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

        <View style={styles.column}><SectionHeader title="Sent announcements" /></View>
        <Card style={styles.column}>
          {history.length === 0 ? (
            <EmptyState icon="bullhorn-outline" title="Nothing sent yet" hint="Your broadcasts will appear here." />
          ) : (
            history.map((h) => <ActivityFeedItem key={h.id} icon="bullhorn-outline" message={h.message} timestamp={h.created_at} />)
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
