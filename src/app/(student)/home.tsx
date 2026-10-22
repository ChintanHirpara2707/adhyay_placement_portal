import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScreenLoader } from '@/components/loading/ScreenLoader';

// Legacy route: job feed moved to /(student)/jobs, home now redirects to dashboard.
export default function LegacyStudentHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(student)/dashboard' as any);
  }, [router]);
  return <ScreenLoader />;
}
