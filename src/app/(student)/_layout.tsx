import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { View } from 'react-native';
import { useTabBarOptions } from '@/components/ui/useTabBarOptions';
import { C } from '@/theme/design';

export default function StudentLayout() {
  const router = useRouter();
  const { session, role, loading } = useAuthStore();
  const tabBarOptions = useTabBarOptions();
  useRoleGuard('student');

  useEffect(() => {
    if (!loading && (!session || role !== 'student')) {
      router.replace('/(auth)/login' as any);
    }
  }, [session, role, loading]);

  if (loading || !session || role !== 'student') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.paper }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <Tabs screenOptions={tabBarOptions}>
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
