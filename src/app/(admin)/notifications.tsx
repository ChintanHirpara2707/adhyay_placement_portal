import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Skeleton } from '@/components/SkeletonLoader';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function AdminNotificationsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
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
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      if (error) {
        Alert.alert('Error', 'Failed to mark notification as read: ' + error.message);
        return;
      }
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    if (!notifications.some((n) => !n.read)) return;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (error) {
      Alert.alert('Error', 'Failed to mark all as read: ' + error.message);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatCreatedAt = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (d: string) => {
    const day = new Date(d);
    const now = new Date();
    return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
  };
  const todayItems = notifications.filter((n) => isToday(n.created_at));
  const earlierItems = notifications.filter((n) => !isToday(n.created_at));

  const renderNotif = (item: Notification, index: number) => (
    <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: Math.min(index * 50, 300) }}>
      <AnimatedPressable onPress={() => handlePressNotification(item)} scaleTo={0.98}>
        <Card style={[styles.card, !item.read && styles.unreadCard]} elevation={item.read ? 0 : 1}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.titleContainer}>
              {!item.read && <View style={styles.unreadDot} />}
              <Text style={[styles.messageText, !item.read ? styles.unreadMessage : styles.readMessage]}>{item.message}</Text>
            </View>
            <Text style={styles.dateText}>{formatCreatedAt(item.created_at)}</Text>
          </Card.Content>
        </Card>
      </AnimatedPressable>
    </MotiView>
  );

  return (
    <View style={styles.container}>
      <WebOnlyDecorations />
      <TopNavbar title="Notifications" subtitle={`${notifications.filter((n) => !n.read).length} unread`} />
      <View style={styles.actionRow}>
        <Button mode="text" textColor={Theme.colors.primaryAccent} onPress={markAllAsRead}>
          Mark all as read
        </Button>
      </View>
      {loading ? (
        <View style={styles.listContainer}>
          <Skeleton height={70} borderRadius={12} style={{ marginBottom: 10 }} />
          <Skeleton height={70} borderRadius={12} style={{ marginBottom: 10 }} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You have no notifications at this time.</Text>
        </View>
      ) : (
        <FlatList
          data={[{ key: 'today', items: todayItems }, { key: 'earlier', items: earlierItems }]}
          keyExtractor={(s) => s.key}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor={Theme.colors.primaryAccent} colors={[Theme.colors.primaryAccent]} />}
          renderItem={({ item: section }) => (
            <View>
              <Text style={styles.sectionTitle}>{section.key === 'today' ? 'Today' : 'Earlier'}</Text>
              {section.items.length === 0 ? (
                <Text style={styles.sectionEmpty}>Nothing here.</Text>
              ) : (
                section.items.map((item, i) => <View key={item.id}>{renderNotif(item, i)}</View>)
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  listContainer: { padding: Theme.spacing.md, gap: Theme.spacing.sm },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Theme.spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.primaryText, marginTop: 8, marginBottom: 4 },
  sectionEmpty: { fontSize: 12, color: Theme.colors.secondaryText, marginBottom: 8 },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.sm },
  unreadCard: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
  cardContent: { padding: Theme.spacing.md },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.primaryAccent, marginRight: 8 },
  messageText: { fontSize: 14, flex: 1, lineHeight: 20 },
  unreadMessage: { fontWeight: '600', color: Theme.colors.primaryText },
  readMessage: { fontWeight: '400', color: Theme.colors.secondaryText },
  dateText: { fontSize: 12, color: Theme.colors.secondaryText, marginTop: 4 },
  emptyContainer: { flex: 1, padding: Theme.spacing.xl, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: Theme.colors.secondaryText, textAlign: 'center' },
});
