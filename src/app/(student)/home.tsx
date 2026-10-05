import { useEffect } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Theme } from '@/theme/theme';

// Legacy route: job feed moved to /(student)/jobs, home now redirects to dashboard.
export default function LegacyStudentHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(student)/dashboard' as any);
  }, [router]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background }}>
      <ActivityIndicator size="large" color={Theme.colors.primaryAccent} />
    </View>
  );
}
