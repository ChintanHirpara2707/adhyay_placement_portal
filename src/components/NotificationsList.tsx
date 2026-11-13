import React, { useMemo, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { PagedFooter } from '@/components/ui/PagedFooter';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

type Row = { kind: 'header'; id: string; label: string } | { kind: 'item'; id: string; n: Notification };

const isToday = (d: string) => {
  const day = new Date(d);
  const now = new Date();
  return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
};

const formatCreatedAt = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** The notifications screen shared by student, company and admin: newest first, 20 per page, Today / Earlier groups. */
export function NotificationsList() {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  const { rows: notifications, setRows: setNotifications, total, loading, refreshing, loadingMore, error: loadError, moreError, hasMore, loadMore, retryMore, refresh, reload } =
    usePaginatedList<Notification>(
      async (from, to) => {
        const { data, error, count } = await supabase
          .from('notifications')
          .select('id, message, read, created_at', { count: 'exact' })
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (error) throw error;
        if (from === 0) {
          // Exact unread badge, independent of how many pages are loaded.
          const { count: unreadCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user!.id)
            .eq('read', false);
          setUnread(unreadCount ?? 0);
        }
        return { rows: (data as Notification[]) ?? [], total: count ?? null };
      },
      [user?.id],
      { reloadOnFocus: true }
    );
  useScreenReady(!loading);

  // Live: a new notification appears (and the unread count updates) without pulling to refresh.
  useRealtimeRefresh([{ table: 'notifications', filter: `user_id=eq.${user?.id}` }], reload, { enabled: !!user });

  const handlePressNotification = async (notification: Notification) => {
    if (notification.read) return;
    try {
      const { data: rows, error } = await supabase.from('notifications').update({ read: true }).eq('id', notification.id).select('id');
      if (error || !rows || rows.length === 0) {
        showAlert('Error', 'Failed to mark notification as read: ' + (error?.message ?? NO_ROWS_MESSAGE));
        return;
      }
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(u - 1, 0));
    } catch (e: any) {
      showAlert('Error', e.message || 'Something went wrong.');
    }
  };

  const markAllAsRead = async () => {
    if (!user || unread === 0) return;
    const { data: rows, error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false).select('id');
    if (error || !rows || rows.length === 0) {
      showAlert('Error', 'Failed to mark all as read: ' + (error?.message ?? NO_ROWS_MESSAGE));
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  // Flat list with section headers so one FlatList (and one onEndReached) drives the whole screen.
  const data = useMemo<Row[]>(() => {
    const today = notifications.filter((n) => isToday(n.created_at));
    const earlier = notifications.filter((n) => !isToday(n.created_at));
    const out: Row[] = [];
    if (today.length) out.push({ kind: 'header', id: 'h-today', label: 'Today' }, ...today.map((n) => ({ kind: 'item' as const, id: n.id, n })));
    if (earlier.length) out.push({ kind: 'header', id: 'h-earlier', label: 'Earlier' }, ...earlier.map((n) => ({ kind: 'item' as const, id: n.id, n })));
    return out;
  }, [notifications]);

  return (
    <View style={styles.container}>
      <TopNavbar title="Notifications" subtitle={`${unread} unread`} />
      <PageHeader title="Notifications" subtitle="Updates about your applications and drives." />
      <View style={styles.actionRow}>
        <Button mode="text" textColor={C.accent} labelStyle={styles.actionLabel} contentStyle={{ minHeight: 44 }} onPress={markAllAsRead} disabled={unread === 0}>
          Mark all as read
        </Button>
      </View>
      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={4} variant="notification" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={refresh} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell-off-outline" title="All caught up" hint="You have no notifications at this time." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} colors={[C.accent]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <PagedFooter loadingMore={loadingMore} moreError={moreError} hasMore={hasMore} onRetry={retryMore} shown={notifications.length} total={total} />
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text style={styles.sectionTitle}>{item.label}</Text>
            ) : (
              <AnimatedPressable onPress={() => handlePressNotification(item.n)} scaleTo={0.98}>
                <View style={[styles.card, !item.n.read && styles.unreadCard]}>
                  <View style={styles.titleContainer}>
                    {!item.n.read && <View style={styles.unreadDot} />}
                    <Text style={[styles.messageText, !item.n.read ? styles.unreadMessage : styles.readMessage]}>{item.n.message}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatCreatedAt(item.n.created_at)}</Text>
                </View>
              </AnimatedPressable>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  listContainer: { ...pageColumn(720), paddingBottom: 24, gap: 10 },
  actionRow: { ...pageColumn(720), flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted, marginTop: 8, marginBottom: 6 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, marginBottom: 10, padding: 14, gap: 4 },
  unreadCard: { backgroundColor: C.accentSoft, borderColor: C.line },
  titleContainer: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, marginRight: 8, marginTop: 6 },
  messageText: { fontSize: 15, flex: 1, minWidth: 0, flexShrink: 1, lineHeight: 22 },
  unreadMessage: { fontWeight: '600', color: C.ink },
  readMessage: { fontWeight: '400', color: C.muted },
  dateText: { fontSize: 12, color: C.muted, marginTop: 4 },
});
