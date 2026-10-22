import { useEffect } from 'react';
import { useLoadingStore } from '@/store/loadingStore';
import { maybeFinishNavigation } from '@/hooks/useSafeNavigate';

/**
 * Call from a screen with `useScreenReady(!loading)`. While `isDataLoaded` is false the top progress bar
 * keeps running; when it turns true (or the screen unmounts) the pending navigation is allowed to finish.
 * Screens that don't call it still finish shortly after the route changes.
 */
export function useScreenReady(isDataLoaded: boolean) {
  useEffect(() => {
    if (isDataLoaded) return;
    const { registerWaitingScreen, unregisterWaitingScreen } = useLoadingStore.getState();
    registerWaitingScreen();
    return () => {
      unregisterWaitingScreen();
      maybeFinishNavigation();
    };
  }, [isDataLoaded]);
}
