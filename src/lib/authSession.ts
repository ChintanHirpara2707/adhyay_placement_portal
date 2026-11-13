import { useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';
import { UserRole, useAuthStore } from '@/store/authStore';

export const dashboardFor = (role: UserRole) =>
  role === 'student' ? '/(student)/dashboard' : role === 'company' ? '/(company)/dashboard' : '/(admin)/dashboard';

/** True when the student/company row is flagged `debarred`. A failed lookup (e.g. column not migrated yet) does not lock anyone out. */
async function isDebarred(userId: string, role: UserRole) {
  if (role === 'admin') return false;
  const { data, error } = await supabase
    .from(role === 'student' ? 'students' : 'companies')
    .select('debarred')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[auth] debarred check failed:', error.message);
    return false;
  }
  return (data as any)?.debarred === true;
}

/**
 * Looks up the signed-in user's row in `users`.
 *  - row exists  -> role is set, user goes to that role's dashboard
 *  - NO row      -> `needsRole` is set (first Google sign-in), user must pick Student/Company.
 *                   A missing row is NEVER defaulted to a role.
 *  - query error -> visible message, then sign out so the user is never stuck on a spinner.
 */
async function syncRole(session: Session) {
  const { data, error } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
  const store = useAuthStore.getState();
  if (store.session?.user.id !== session.user.id) return; // signed out / switched account while waiting

  if (error) {
    showAlert('Could not load your account', error.message);
    await store.logout();
    store.setLoading(false);
    return;
  }
  if (data?.role && (await isDebarred(session.user.id, data.role as UserRole))) {
    if (useAuthStore.getState().session?.user.id !== session.user.id) return;
    showAlert('Account debarred', 'Your account has been debarred by the placement cell. Please contact them for help.');
    await store.logout();
    store.setLoading(false);
    return;
  }
  if (data?.role) {
    store.setRole(data.role as UserRole);
    store.setNeedsRole(false);
  } else {
    store.setRole(null);
    store.setNeedsRole(true);
  }
  store.setRoleResolved(true);
  store.setLoading(false);
}

// One role lookup per signed-in user: focus-refresh SIGNED_IN events and token refreshes for the same user are ignored.
let syncedFor: string | null = null;

function handleSession(session: Session | null) {
  const store = useAuthStore.getState();
  store.setSession(session);
  if (!session) {
    syncedFor = null;
    store.setRole(null);
    store.setNeedsRole(false);
    store.setRoleResolved(true);
    store.setLoading(false);
    return;
  }
  if (syncedFor === session.user.id) {
    store.setLoading(false);
    return;
  }
  syncedFor = session.user.id;
  store.setRoleResolved(false);
  syncRole(session).catch((e) => {
    showAlert('Could not load your account', e?.message || 'Something went wrong.');
    store.setRoleResolved(true);
    store.setLoading(false);
  });
}

/**
 * Re-runs the startup session + role resolution (used by the "Retry" action when startup is slow).
 * Resolves quietly; failures surface through the store / alerts like the first attempt.
 */
export function retryStartup() {
  const store = useAuthStore.getState();
  syncedFor = null;
  store.setLoading(true);
  supabase.auth
    .getSession()
    .then(({ data: { session } }) => handleSession(session))
    .catch((e) => {
      showAlert('Could not reach the server', e?.message || 'Check your connection and try again.');
      store.setLoading(false);
    });
}

/**
 * Keeps the auth store in sync with Supabase: an initial getSession() check plus onAuthStateChange.
 * Both feed one handler (handleSession). Runs in the background while the intro animation plays.
 */
export function useAuthBootstrap() {
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => handleSession(session))
      .catch((e) => {
        showAlert('Could not reach the server', e?.message || 'Check your connection and try again.');
        useAuthStore.getState().setLoading(false);
      });
    // Deferred: calling Supabase inside the callback itself can deadlock the auth client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => handleSession(session), 0);
    });
    return () => subscription.unsubscribe();
  }, []);
}

/**
 * Single place that decides where a signed-in user belongs. Runs once per (screen, outcome):
 *  - session + role, on a public/auth screen  -> that role's dashboard
 *  - session + NO users row                   -> /(auth)/choose-role (and nowhere else)
 *  - no session, on choose-role               -> login
 * /signup and the password-reset screens are left alone on purpose (signup signs itself out; the
 * reset flow briefly holds a recovery session).
 */
export function useAuthGate() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const navState = useRootNavigationState();
  const { session, role, needsRole, roleResolved, loading } = useAuthStore();
  const lastKey = useRef('');

  useEffect(() => {
    if (!navState?.key || loading) return;
    const [top, second] = segments;
    const onLanding = !top;
    const onLogin = top === '(auth)' && second === 'login';
    const onChooseRole = top === '(auth)' && second === 'choose-role';
    const inRoleGroup = top === '(student)' || top === '(company)' || top === '(admin)';

    let target: string | null = null;
    if (!session) {
      if (onChooseRole) target = '/(auth)/login';
    } else if (roleResolved) {
      if (role) {
        if (onLanding || onLogin || onChooseRole) target = dashboardFor(role);
      } else if (needsRole) {
        if (!onChooseRole && (onLanding || onLogin || inRoleGroup)) target = '/(auth)/choose-role';
      }
    }

    if (!target) return;
    const key = `${target}|${segments.join('/')}|${session?.user.id ?? ''}`;
    if (lastKey.current === key) return; // already navigating from here
    lastKey.current = key;
    router.replace(target as any);
  }, [navState?.key, loading, session, role, needsRole, roleResolved, segments.join('/')]);
}
