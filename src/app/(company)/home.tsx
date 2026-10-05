import { useEffect } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Theme } from '@/theme/theme';

// Legacy route: /(company)/home now redirects to /(company)/dashboard. Job list moved to my-jobs.
export default function LegacyCompanyHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(company)/dashboard' as any);
  }, [router]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background }}>
      <ActivityIndicator size="large" color={Theme.colors.primaryAccent} />
    </View>
  );
}
