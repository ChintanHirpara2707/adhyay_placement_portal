import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore, UserRole } from '@/store/authStore';

/**
 * Safety net: re-fetch the live role from the users table and bounce
 * the user out if it doesn't match the route group they are inside.
 * Guards against stale store state or a bad login redirect.
 */
export function useRoleGuard(expected: UserRole) {
  const router = useRouter();
  const { session, loading, setRole } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!session?.user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const liveRole = (data as any)?.role as UserRole | null;
      if (error || !liveRole) {
        console.warn('[role-guard] no live role, signing out');
        await supabase.auth.signOut().catch(() => {});
        router.replace('/(auth)/login' as any);
        return;
      }
      setRole(liveRole);
      if (liveRole !== expected) {
        console.warn(`[role-guard] expected ${expected}, found ${liveRole} — redirecting`);
        if (liveRole === 'student') router.replace('/(student)/dashboard' as any);
        else if (liveRole === 'company') router.replace('/(company)/dashboard' as any);
        else router.replace('/(admin)/dashboard' as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, session, expected, router, setRole]);
}
