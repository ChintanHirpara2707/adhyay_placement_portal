import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useLoadingStore } from '@/store/loadingStore';

/**
 * Safe navigation = router.push / router.replace that
 *  1. starts the top progress bar,
 *  2. ignores repeat taps while a navigation is still pending (no double navigation),
 *  3. stops the bar when the destination screen reports ready (see useScreenReady), or - for screens
 *     that don't report - shortly after the route has changed.
 * A navigation that never changes the route is released after FALLBACK_MS; MAX_MS in the store is the
 * last-resort net.
 */

const FALLBACK_MS = 1500; // route did not change (e.g. tapping the tab you are already on)
const SETTLE_MS = 120; // grace for the destination to register that it is still loading

let pendingKey: string | null = null;
let seq = 0;
let currentPath = '';
let settleTimer: ReturnType<typeof setTimeout> | null = null;

export function finishNavigation() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = null;
  const { keys, stopLoading } = useLoadingStore.getState();
  Object.keys(keys)
    .filter((k) => k.startsWith('nav:'))
    .forEach(stopLoading);
  pendingKey = null;
}

/** Marks a navigation as started (used by the hook and by tab presses). Returns false if one is already pending. */
export function beginNavigation(): boolean {
  if (pendingKey) return false;
  const key = `nav:${++seq}`;
  pendingKey = key;
  useLoadingStore.getState().startLoading(key, 'nav');
  const startedAt = currentPath;
  setTimeout(() => {
    if (pendingKey === key && currentPath === startedAt) finishNavigation();
  }, FALLBACK_MS);
  return true;
}

/** Finishes the pending navigation once no mounted screen is still waiting for its data. */
export function maybeFinishNavigation() {
  if (!pendingKey) return;
  if (useLoadingStore.getState().waitingScreens > 0) return;
  finishNavigation();
}

/** Mount once (root layout). Watches the route and settles the pending navigation after a change. */
export function useNavigationWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    const changed = currentPath !== pathname;
    currentPath = pathname;
    if (!changed || !pendingKey) return;
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      maybeFinishNavigation();
    }, SETTLE_MS);
  }, [pathname]);
}

export function useSafeNavigate() {
  const router = useRouter();

  const run = useCallback(
    (method: 'push' | 'replace', href: Parameters<typeof router.push>[0]) => {
      if (!beginNavigation()) return false; // a navigation is already pending: ignore the repeat tap
      try {
        router[method](href);
      } catch (e) {
        finishNavigation();
        throw e;
      }
      return true;
    },
    [router]
  );

  const push = useCallback((href: Parameters<typeof router.push>[0]) => run('push', href), [run]);
  const replace = useCallback((href: Parameters<typeof router.push>[0]) => run('replace', href), [run]);
  return { push, replace, back: router.back };
}

/** Spread onto <Tabs screenListeners={...}>: tapping a tab starts the progress bar like any other navigation. */
export const tabNavigationListeners = {
  tabPress: () => {
    beginNavigation();
  },
};
