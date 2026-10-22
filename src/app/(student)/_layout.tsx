import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/loading/ScreenLoader';
import { tabNavigationListeners } from '@/hooks/useSafeNavigate';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useTabBarOptions } from '@/components/ui/useTabBarOptions';

export default function StudentLayout() {
  const router = useRouter();
  const { session, role, loading, needsRole, roleResolved } = useAuthStore();
  const tabBarOptions = useTabBarOptions();
  useRoleGuard('student');

  useEffect(() => {
    if (loading || (session && !roleResolved)) return;
    if (session && needsRole) {
      router.replace('/(auth)/choose-role' as any);
      return;
    }
    if (!session || role !== 'student') {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading, needsRole, roleResolved]);

  if (loading || !session || role !== 'student') {
    return <ScreenLoader />;
  }

  return (
    <Tabs screenOptions={tabBarOptions} screenListeners={tabNavigationListeners}>
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
        name="jobs"
        options={{
          title: 'Job Feed',
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="briefcase-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'My Applications',
          tabBarLabel: 'Applications',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="file-document-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: 'Interviews',
          tabBarLabel: 'Interviews',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="calendar-clock" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="home" options={{ href: null, title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'My Profile' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
      <Tabs.Screen name="job/[id]" options={{ href: null, title: 'Job Details' }} />
    </Tabs>
  );
}
