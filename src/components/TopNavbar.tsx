import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getInitials } from '@/lib/format';
import { C, LOGO_RATIO } from '@/theme/design';

interface TopNavbarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title = 'PlacementPortal',
  subtitle,
  showBack = false,
}) => {
  const router = useRouter();
  const { user, role, logout } = useAuthStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchBadge = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  const fetchDisplayName = useCallback(async () => {
    if (!user) {
      setDisplayName(null);
      return;
    }
    try {
      if (role === 'student') {
        const { data } = await supabase.from('students').select('full_name').eq('id', user.id).maybeSingle();
        setDisplayName((data as any)?.full_name ?? null);
      } else if (role === 'company') {
        const { data } = await supabase.from('companies').select('company_name').eq('id', user.id).maybeSingle();
        setDisplayName((data as any)?.company_name ?? null);
      } else {
        setDisplayName('Admin');
      }
    } catch {
      setDisplayName(null);
    }
  }, [user, role]);

  useFocusEffect(
    useCallback(() => {
      fetchBadge();
      fetchDisplayName();
    }, [fetchBadge, fetchDisplayName])
  );

  const goNotifications = () => {
    if (role === 'company') router.push('/(company)/notifications' as any);
    else if (role === 'admin') router.push('/(admin)/notifications' as any);
    else router.push('/(student)/notifications' as any);
  };

  const goProfile = () => {
    setMenuVisible(false);
    if (role === 'student') router.push('/(student)/profile' as any);
    else if (role === 'company') router.push('/(company)/profile' as any);
    else router.push('/(admin)/profile' as any);
  };

  const goSettings = () => {
    setMenuVisible(false);
    goProfile();
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    try {
      await supabase.auth.signOut();
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const rolePill = () => {
    if (role === 'admin') return { label: 'Admin', color: C.accent, bg: C.accentSoft };
    if (role === 'company') return { label: 'Company', color: C.accent, bg: C.accentSoft };
    if (role === 'student') return { label: 'Student', color: C.success, bg: C.successSoft };
    return { label: 'Portal', color: C.muted, bg: '#EEF0F4' };
  };
  const pill = rolePill();

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.ink} />
          </TouchableOpacity>
        ) : (
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ height: 30, width: 30 * LOGO_RATIO }}
            resizeMode="contain"
            accessibilityLabel="Adhyay logo"
          />
        )}
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
            </View>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} onPress={goNotifications} activeOpacity={0.8}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={C.ink} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity style={styles.avatar} onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
              <Text style={styles.avatarText}>{getInitials(displayName, user?.email)}</Text>
            </TouchableOpacity>
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item leadingIcon="account-outline" onPress={goProfile} title="Profile" />
          <Menu.Item leadingIcon="cog-outline" onPress={goSettings} title="Settings" />
          <Menu.Item leadingIcon="logout" onPress={handleLogout} title="Logout" />
        </Menu>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 60,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 0 } as any) : null),
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: C.muted },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  menuContent: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8 },
});
