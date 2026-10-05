import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { supabase } from '@/lib/supabase';

interface AppTopNavbarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const AppTopNavbar: React.FC<AppTopNavbarProps> = ({
  title = 'PlacementPortal',
  subtitle,
  showBack = false,
}) => {
  const router = useRouter();
  const { user, role, logout } = useAuthStore();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: Theme.colors.primaryAccent, bg: '#EFF6FF' };
      case 'company':
        return { label: 'Company', color: '#7C3AED', bg: '#F5F3FF' };
      case 'student':
        return { label: 'Student', color: '#059669', bg: '#ECFDF5' };
      default:
        return { label: 'Portal', color: Theme.colors.secondaryText, bg: '#F3F4F6' };
    }
  };

  const roleInfo = getRoleBadge();

  const handleQuickLogout = async () => {
    try {
      await supabase.auth.signOut();
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <View style={styles.navbarContainer}>
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={Theme.colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="school-outline" size={22} color={Theme.colors.primaryAccent} />
          </View>
        )}
        <View style={styles.titleWrapper}>
          <View style={styles.titleRow}>
            <Text style={styles.appTitle}>{title}</Text>
            <View style={[styles.rolePill, { backgroundColor: roleInfo.bg }]}>
              <Text style={[styles.rolePillText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
            </View>
          </View>
          {subtitle ? <Text style={styles.appSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightSection}>
        {role === 'student' && (
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => router.push('/(student)/notifications' as any)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={Theme.colors.primaryText} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionIcon}
          onPress={() => {
            if (role === 'student') router.push('/(student)/profile' as any);
            else if (role === 'admin') router.push('/(admin)/dashboard' as any);
            else if (role === 'company') router.push('/(company)/home' as any);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="account-circle-outline" size={22} color={Theme.colors.primaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutIcon}
          onPress={handleQuickLogout}
          activeOpacity={0.7}
          accessibilityLabel="Log Out"
        >
          <MaterialCommunityIcons name="logout" size={18} color={Theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbarContainer: {
    height: 56,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    borderRadius: 6,
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.primaryText,
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 11,
    color: Theme.colors.secondaryText,
    fontWeight: '400',
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.pill,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
