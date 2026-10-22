import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';

// Lets the auth popup/tab hand its result back to the opener (web) - required by expo-web-browser.
WebBrowser.maybeCompleteAuthSession();

export type GoogleResult = 'redirecting' | 'signed-in' | 'cancelled';

const first = (v: string | string[] | undefined | null) => (Array.isArray(v) ? v[0] : v ?? undefined);

/** Reads an error from either the query string or the #fragment of the redirect URL. */
function errorFromUrl(url: string): string | undefined {
  const q = Linking.parse(url).queryParams ?? {};
  const fromQuery = first(q.error_description) ?? first(q.error);
  if (fromQuery) return fromQuery;
  const hash = url.split('#')[1];
  if (hash) {
    const h = new URLSearchParams(hash);
    return h.get('error_description') ?? h.get('error') ?? undefined;
  }
  return undefined;
}

/**
 * Starts Google sign-in through Supabase (PKCE).
 *  - web:    full-page redirect to Google and back to the site origin; the client picks the session up from ?code=
 *  - native: opens an auth session in the system browser, then exchanges the returned ?code= for a session
 * Throws with the exact Supabase/Google message on failure. 'cancelled' means the user closed the browser.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw error;
    return 'redirecting';
  }

  const redirectTo = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Supabase did not return a Google sign-in URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled'; // cancel / dismiss: user backed out, not an error

  const urlError = errorFromUrl(result.url);
  if (urlError) throw new Error(urlError);
  const code = first(Linking.parse(result.url).queryParams?.code);
  if (!code) throw new Error('Google sign-in did not return an authorization code.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'signed-in';
}

/** Button state + handler for "Continue with Google": spinner, double-tap guard, quiet cancel, visible errors. */
export function useGoogleSignIn() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const reset = useCallback(() => {
    busy.current = false;
    setLoading(false);
  }, []);

  // Web: if the user presses Back from Google's page the app is restored from the back-forward cache
  // with the spinner still on; re-enable the button.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [reset]);

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'redirecting') return; // the page is navigating to Google; keep the spinner
      if (result === 'signed-in') nav.replace('/'); // useAuthGate then routes by role / choose-role
      reset();
    } catch (e: any) {
      showAlert('Google sign-in failed', e?.message || 'Something went wrong. Please try again.');
      reset();
    }
  }, [router, reset]);

  return { start, loading };
}
