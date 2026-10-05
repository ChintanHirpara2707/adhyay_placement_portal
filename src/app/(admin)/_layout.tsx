import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { View } from 'react-native';
import { Theme } from '@/theme/theme';

export default function AdminLayout() {
  const router = useRouter();
  const { session, role, loading } = useAuthStore();
  useRoleGuard('admin');

  useEffect(() => {
    if (!loading && (!session || role !== 'admin')) {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading]);

  if (loading || !session || role !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.colors.primaryAccent,
        tabBarInactiveTintColor: Theme.colors.secondaryText,
        tabBarStyle: {
          backgroundColor: Theme.colors.background,
          borderTopColor: Theme.colors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: Theme.typography.sizes.caption,
          fontWeight: Theme.typography.weights.medium as any,
        },
        headerShown: false,
      }}
    >
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
            <AnimatedTabIcon name="briefcase-edit" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Manage Students',
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="account-multiple" color={color} size={size} focused={focused} />
          ),
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
