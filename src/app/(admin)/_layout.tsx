import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/loading/ScreenLoader';
import { tabNavigationListeners } from '@/hooks/useSafeNavigate';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useTabBarOptions } from '@/components/ui/useTabBarOptions';

export default function AdminLayout() {
  const router = useRouter();
  const { session, role, loading, needsRole, roleResolved } = useAuthStore();
  const tabBarOptions = useTabBarOptions();
  useRoleGuard('admin');

  useEffect(() => {
    if (loading || (session && !roleResolved)) return;
    if (session && needsRole) {
      router.replace('/(auth)/choose-role' as any);
      return;
    }
    if (!session || role !== 'admin') {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading, needsRole, roleResolved]);

  if (loading || !session || role !== 'admin') {
    return <ScreenLoader />;
  }

  return (
    <Tabs screenOptions={tabBarOptions} screenListeners={tabNavigationListeners}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="chart-bar" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Company Approvals',
          tabBarLabel: 'Approvals',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="checkbox-marked-circle-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Manage Jobs',
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="briefcase-edit-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Manage Students',
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="account-multiple-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          href: null,
          title: 'Companies',
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          href: null,
          title: 'Broadcast',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Notifications',
        }}
      />
    </Tabs>
  );
}
