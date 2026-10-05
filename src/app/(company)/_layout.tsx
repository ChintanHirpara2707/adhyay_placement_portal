import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { View } from 'react-native';
import { Theme } from '@/theme/theme';

export default function CompanyLayout() {
  const router = useRouter();
  const { session, role, loading } = useAuthStore();
  useRoleGuard('company');

  useEffect(() => {
    if (!loading && (!session || role !== 'company')) {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading]);

  if (loading || !session || role !== 'company') {
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
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="view-dashboard-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-jobs"
        options={{
          title: 'My Jobs',
          tabBarLabel: 'My Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="briefcase" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="post-job"
        options={{
          title: 'Post Job',
          tabBarLabel: 'Post Job',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="plus-circle-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="home" options={{ href: null, title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
      <Tabs.Screen name="applicants/[jobId]" options={{ href: null, title: 'Applicants' }} />
      <Tabs.Screen name="applicant/[id]" options={{ href: null, title: 'Applicant Detail' }} />
    </Tabs>
  );
}
