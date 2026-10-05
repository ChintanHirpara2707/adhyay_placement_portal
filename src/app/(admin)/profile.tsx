import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { getInitials } from '@/lib/format';

export default function AdminProfileScreen() {
  const { user, role } = useAuthStore();

  return (
    <View style={styles.container}>
      <TopNavbar title="Profile" subtitle="Administrator" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials('Admin', user?.email)}</Text>
              </View>
              <Text style={styles.name}>Placement Admin</Text>
              <Text style={styles.email}>{user?.email ?? ''}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(role ?? 'admin').toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              Admin accounts are created manually and are read-only here. Use the profile menu to log out.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.spacing.md },
  card: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  cardContent: { gap: 8 },
  avatarWrap: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Theme.colors.primaryAccent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 26 },
  name: { fontSize: 18, fontWeight: '700', color: Theme.colors.primaryText },
  email: { fontSize: 13, color: Theme.colors.secondaryText },
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Theme.borderRadius.pill, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: Theme.colors.primaryAccent },
  hint: { fontSize: 12, color: Theme.colors.secondaryText, textAlign: 'center', marginTop: 8 },
});
