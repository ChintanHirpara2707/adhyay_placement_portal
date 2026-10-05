import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getInitials } from '@/lib/format';
import { Theme } from '@/theme/theme';

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
    if (role === 'admin') return { label: 'Admin', color: Theme.colors.primaryAccent, bg: '#EFF6FF' };
    if (role === 'company') return { label: 'Company', color: '#7C3AED', bg: '#F5F3FF' };
    if (role === 'student') return { label: 'Student', color: '#059669', bg: '#ECFDF5' };
    return { label: 'Portal', color: Theme.colors.secondaryText, bg: '#F3F4F6' };
  };
  const pill = rolePill();

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Theme.colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logo}>
            <MaterialCommunityIcons name="school-outline" size={22} color={Theme.colors.primaryAccent} />
          </View>
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
        <TouchableOpacity style={styles.iconBtn} onPress={goNotifications} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={Theme.colors.primaryText} />
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
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 0 } as any) : null),
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, flex: 1 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText },
  subtitle: { fontSize: 11, color: Theme.colors.secondaryText },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Theme.borderRadius.pill },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  menuContent: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8 },
});
