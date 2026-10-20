import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Skeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to retrieve notifications: ' + error.message);
        return;
      }

      setNotifications(data || []);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [user])
  );

  const handlePressNotification = async (notification: Notification) => {
    if (notification.read) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) {
        Alert.alert('Error', 'Failed to mark notification as read: ' + error.message);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (error) {
      Alert.alert('Error', 'Failed to mark all as read: ' + error.message);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatCreatedAt = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (d: string) => {
    const day = new Date(d);
    const now = new Date();
    return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
  };
  const todayItems = notifications.filter((n) => isToday(n.created_at));
  const earlierItems = notifications.filter((n) => !isToday(n.created_at));

  const renderNotif = (item: Notification) => (
    <AnimatedPressable
      onPress={() => handlePressNotification(item)}
      scaleTo={0.98}
    >
      <View style={[styles.card, !item.read && styles.unreadCard]}>
        <View style={styles.titleContainer}>
          {!item.read && <View style={styles.unreadDot} />}
          <Text style={[styles.messageText, !item.read ? styles.unreadMessage : styles.readMessage]}>
            {item.message}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatCreatedAt(item.created_at)}
        </Text>
      </View>
    </AnimatedPressable>
  );

  return (
    <View style={styles.container}>
      <TopNavbar title="Notifications" subtitle={`${notifications.filter((n) => !n.read).length} unread`} />
      <PageHeader title="Notifications" subtitle="Updates about your applications and drives." />
      <View style={styles.actionRow}>
        <Button mode="text" textColor={C.accent} labelStyle={styles.actionLabel} contentStyle={{ minHeight: 44 }} onPress={markAllAsRead}>
          Mark all as read
        </Button>
      </View>
      {loading ? (
        <View style={styles.listContainer}>
          <Skeleton height={70} borderRadius={14} style={{ marginBottom: 10 }} />
          <Skeleton height={70} borderRadius={14} style={{ marginBottom: 10 }} />
          <Skeleton height={70} borderRadius={14} style={{ marginBottom: 10 }} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell-off-outline" title="All caught up" hint="You have no notifications at this time." />
      ) : (
        <FlatList
          data={[{ key: 'today', items: todayItems }, { key: 'earlier', items: earlierItems }]}
          keyExtractor={(s) => s.key}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
          renderItem={({ item: section }) => (
            <View>
              <Text style={styles.sectionTitle}>{section.key === 'today' ? 'Today' : 'Earlier'}</Text>
              {section.items.length === 0 ? (
                <Text style={styles.sectionEmpty}>Nothing here.</Text>
              ) : (
                section.items.map((item) => <View key={item.id}>{renderNotif(item)}</View>)
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  listContainer: { ...pageColumn(720), paddingBottom: 24, gap: 10 },
  actionRow: { ...pageColumn(720), flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionEmpty: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 10,
    padding: 14,
    gap: 4,
  },
  unreadCard: {
    backgroundColor: C.accentSoft,
    borderColor: C.line,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginRight: 8,
    marginTop: 6,
  },
  messageText: {
    fontSize: 15,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    lineHeight: 22,
  },
  unreadMessage: {
    fontWeight: '600',
    color: C.ink,
  },
  readMessage: {
    fontWeight: '400',
    color: C.muted,
  },
  dateText: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },
});
