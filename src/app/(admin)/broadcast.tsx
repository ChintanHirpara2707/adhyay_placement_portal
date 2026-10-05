import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
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
    <View style={styles.container}>
      <TopNavbar title="Broadcast" subtitle="Notify students" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Theme.colors.primaryAccent} />}
      >
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="e.g. TCS interviews start Monday — check your schedule."
              value={message}
              onChangeText={setMessage}
              style={styles.input}
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
              <View style={styles.chips}>
                {BRANCHES.map((b) => (
                  <Text
                    key={b}
                    onPress={() => setBranch(b)}
                    style={[styles.chip, branch === b && styles.chipActive]}
                  >
                    {b}
                  </Text>
                ))}
              </View>
            ) : null}
            <Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={handleBroadcast} buttonColor={Theme.colors.primaryAccent} textColor="#fff" style={styles.send}>
              Send Broadcast
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.section}>Sent history</Text>
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.feedContent}>
            {history.length === 0 ? (
              <Text style={styles.empty}>No broadcasts sent yet.</Text>
            ) : (
              history.map((h) => <ActivityFeedItem key={h.id} icon="bullhorn-outline" message={h.message} timestamp={h.created_at} />)
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.spacing.md, gap: Theme.spacing.md, paddingBottom: 24 },
  card: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  cardContent: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: Theme.colors.secondaryText },
  input: { backgroundColor: Theme.colors.background, fontSize: 14 },
  count: { fontSize: 11, color: Theme.colors.secondaryText, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.borderRadius.pill, borderWidth: 1, borderColor: Theme.colors.border, color: Theme.colors.secondaryText, fontSize: 12, fontWeight: '600' },
  chipActive: { backgroundColor: Theme.colors.primaryAccent, borderColor: Theme.colors.primaryAccent, color: '#fff' },
  send: { borderRadius: Theme.borderRadius.button, marginTop: 8 },
  section: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText, marginTop: 4 },
  feedContent: { paddingVertical: 6 },
  empty: { fontSize: 13, color: Theme.colors.secondaryText, textAlign: 'center', paddingVertical: 10 },
});
