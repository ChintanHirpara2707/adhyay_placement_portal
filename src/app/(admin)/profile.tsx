import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MotiView } from 'moti';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, StatusChip } from '@/components/ui/kit';
import { getInitials } from '@/lib/format';

export default function AdminProfileScreen() {
  const { user, role } = useAuthStore();

  return (
    <View style={styles.shell}>
      <TopNavbar title="Profile" subtitle="Administrator" />
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
          <Text style={styles.eyebrow}>Placement Cell</Text>
          <Text style={styles.heading}>Admin profile</Text>
        </MotiView>
        <Card>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials('Admin', user?.email)}</Text>
            </View>
            <Text style={styles.name}>Placement Admin</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email ?? ''}</Text>
            <StatusChip label={String(role ?? 'admin').toUpperCase()} tone="accent" />
          </View>
          <Text style={styles.hint}>
            Admin accounts are created manually and are read-only here. Use the profile menu to log out.
          </Text>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.accent },
  heading: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -1, marginTop: 4 },
  avatarWrap: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 28 },
  name: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  email: { fontSize: 13, color: C.muted },
  hint: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
