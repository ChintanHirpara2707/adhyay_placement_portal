import React, { useRef, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { showAlert, NO_ROWS_MESSAGE } from '@/lib/alert';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { PagedFooter } from '@/components/ui/PagedFooter';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { EmptyState, FilterChips, PageHeader, StatusChip, pageColumn } from '@/components/ui/kit';

interface Ticket {
  id: string;
  user_id: string;
  role: string | null;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
  users: { email: string } | null;
}

type StatusFilter = 'open' | 'resolved' | 'all';

export default function AdminQueriesScreen() {
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const { rows: tickets, setRows: setTickets, total, loading, refreshing, loadingMore, error: loadError, moreError, hasMore, loadMore, retryMore, refresh, reload } =
    usePaginatedList<Ticket>(
      async (from, to) => {
        let q = supabase
          .from('support_tickets')
          .select('id, user_id, role, subject, message, status, admin_reply, created_at, resolved_at, users(email)', { count: 'exact' });
        if (filter !== 'all') q = q.eq('status', filter);
        // Oldest open query first so nothing waits forever; resolved/all show newest first.
        const { data, error, count } = await q
          .order('created_at', { ascending: filter === 'open' })
          .order('id', { ascending: filter === 'open' })
          .range(from, to);
        if (error) throw error;
        return { rows: (data as any[]) ?? [], total: count ?? null };
      },
      [filter],
      { reloadOnFocus: true }
    );
  useScreenReady(!loading);

  // Live: new queries from users appear as they are sent.
  useRealtimeRefresh([{ table: 'support_tickets' }], reload);

  const resolve = async (t: Ticket) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(t.id);
    try {
      const reply = (replies[t.id] ?? '').trim();
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved', admin_reply: reply || null, resolved_at: new Date().toISOString() })
        .eq('id', t.id)
        .eq('status', 'open')
        .select('id');
      if (error) {
        showAlert('Could not resolve', error.message);
        return;
      }
      if (!data || data.length === 0) {
        showAlert('Already resolved', 'This query was already resolved. ' + NO_ROWS_MESSAGE);
        refresh();
        return;
      }
      setTickets((prev) =>
        filter === 'open'
          ? prev.filter((x) => x.id !== t.id)
          : prev.map((x) => (x.id === t.id ? { ...x, status: 'resolved', admin_reply: reply || null, resolved_at: new Date().toISOString() } : x))
      );
      setOpenId(null);

      // Tell the user (their bell + the Help page). Admins may insert notifications for any user.
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: t.user_id,
        message: reply
          ? `The placement cell replied to your query "${t.subject}": ${reply}`
          : `Your query "${t.subject}" has been marked resolved by the placement cell.`,
        read: false,
      });
      if (notifError) {
        showAlert('Resolved', 'The query is resolved, but the notification could not be sent: ' + notifError.message);
        return;
      }
      showAlert('Resolved', 'The query was resolved and the user was notified.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Something went wrong.');
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <TopNavbar title="Queries" subtitle="Messages from users" showBack />
      <PageHeader
        title="Support queries"
        subtitle={loading ? 'Loading…' : `${total ?? tickets.length} ${filter === 'all' ? '' : filter + ' '}${(total ?? tickets.length) === 1 ? 'query' : 'queries'}`}
      />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'all', label: 'All' },
        ]}
      />
      {loading ? (
        <View style={styles.list}>
          <SkeletonList count={3} variant="notification" />
        </View>
      ) : loadError ? (
        <View style={styles.list}>
          <LoadError message={loadError} onRetry={refresh} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<PagedFooter loadingMore={loadingMore} moreError={moreError} hasMore={hasMore} onRetry={retryMore} shown={tickets.length} total={total} />}
          renderItem={({ item }) => {
            const open = openId === item.id;
            return (
              <View style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.subject} numberOfLines={open ? undefined : 2}>{item.subject}</Text>
                  <StatusChip label={item.status === 'resolved' ? 'Resolved' : 'Open'} tone={item.status === 'resolved' ? 'success' : 'warning'} />
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.users?.email ?? 'Unknown user'}
                  {item.role ? ` · ${item.role}` : ''} · {formatDateTime(item.created_at)}
                </Text>
                <Text style={styles.message} numberOfLines={open ? undefined : 3} selectable={open}>
                  {item.message}
                </Text>

                {item.admin_reply ? (
                  <View style={styles.reply}>
                    <Text style={styles.replyLabel}>YOUR REPLY</Text>
                    <Text style={styles.replyText}>{item.admin_reply}</Text>
                  </View>
                ) : null}

                {item.status === 'open' ? (
                  open ? (
                    <View style={styles.form}>
                      <TextInput
                        mode="outlined"
                        label="Reply (optional)"
                        value={replies[item.id] ?? ''}
                        onChangeText={(t) => setReplies((r) => ({ ...r, [item.id]: t }))}
                        multiline
                        maxLength={1000}
                        style={styles.input}
                        outlineColor={C.line}
                        activeOutlineColor={C.accent}
                      />
                      <View style={styles.row}>
                        <Button mode="contained" icon="check" onPress={() => resolve(item)} loading={busyId === item.id} disabled={busyId !== null} buttonColor={C.accent} textColor="#FFFFFF" style={styles.btn} contentStyle={styles.btnContent}>
                          Reply & resolve
                        </Button>
                        <Button mode="outlined" onPress={() => setOpenId(null)} disabled={busyId !== null} textColor={C.muted} style={[styles.btn, { borderColor: C.line }]} contentStyle={styles.btnContent}>
                          Close
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <Button mode="outlined" icon="reply" onPress={() => setOpenId(item.id)} textColor={C.accent} style={styles.openBtn} contentStyle={styles.btnContent}>
                      Open & reply
                    </Button>
                  )
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="message-check-outline"
              title={filter === 'open' ? 'No open queries' : 'No queries found'}
              hint={filter === 'open' ? 'New messages from students and companies will appear here.' : 'Nothing matches this filter.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  list: { ...pageColumn(720), paddingTop: 8, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: C.muted },
  message: { fontSize: 14, color: C.ink, lineHeight: 21 },
  reply: { backgroundColor: C.successSoft, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, gap: 2 },
  replyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: C.success },
  replyText: { fontSize: 14, color: C.ink, lineHeight: 20 },
  form: { gap: 10, marginTop: 4 },
  input: { backgroundColor: C.card, fontSize: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: { flex: 1, minWidth: 130, borderRadius: 10 },
  btnContent: { minHeight: 44 },
  openBtn: { borderRadius: 10, borderColor: C.line, marginTop: 4 },
});
