import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/loading/ScreenLoader';
import { tabNavigationListeners } from '@/hooks/useSafeNavigate';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useTabBarOptions } from '@/components/ui/useTabBarOptions';

export default function CompanyLayout() {
  const router = useRouter();
  const { session, role, loading, needsRole, roleResolved } = useAuthStore();
  const tabBarOptions = useTabBarOptions();
  useRoleGuard('company');

  useEffect(() => {
    if (loading || (session && !roleResolved)) return;
    if (session && needsRole) {
      router.replace('/(auth)/choose-role' as any);
      return;
    }
    if (!session || role !== 'company') {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading, needsRole, roleResolved]);

  if (loading || !session || role !== 'company') {
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
        name="my-jobs"
        options={{
          title: 'My Jobs',
          tabBarLabel: 'My Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="briefcase-outline" color={color} size={size} focused={focused} />
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
