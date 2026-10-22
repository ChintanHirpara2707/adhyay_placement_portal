import { useCallback, useRef, useState } from 'react';
import { showAlert } from '@/lib/alert';

/**
 * Loading state shared by every data screen.
 *  - `loading`   true only until the FIRST successful load (drives the skeleton; revisiting a tab keeps
 *                its data on screen and refreshes quietly instead of flashing a skeleton again)
 *  - `refreshing` pull-to-refresh only (never a full-screen takeover)
 *  - `error`     the real message when the FIRST load fails -> render <LoadError onRetry/> (never a blank screen).
 *                A failed refresh keeps the old data and shows a dialog instead.
 */
export function useLoadState(what = 'this screen') {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const begin = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!loadedOnce.current) {
      setLoading(true);
      setError(null);
    }
  }, []);

  const succeed = useCallback(() => {
    loadedOnce.current = true;
    setError(null);
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      const message = (e as any)?.message || 'Something went wrong.';
      if (loadedOnce.current) showAlert(`Could not refresh ${what}`, message);
      else setError(message);
    },
    [what]
  );

  const end = useCallback(() => {
    setLoading(false);
    setRefreshing(false);
  }, []);

  return { loading, refreshing, error, begin, succeed, fail, end };
}
