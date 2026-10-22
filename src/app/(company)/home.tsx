import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/loading/ScreenLoader';

// Legacy route: /(company)/home now redirects to /(company)/dashboard. Job list moved to my-jobs.
export default function LegacyCompanyHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(company)/dashboard' as any);
  }, [router]);
  return <ScreenLoader />;
}
