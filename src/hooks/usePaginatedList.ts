import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { showAlert } from '@/lib/alert';

export const PAGE_SIZE = 20;

export interface Page<T> {
  rows: T[];
  /** Exact total of matching rows when the query asked for it (`{ count: 'exact' }`), else null. */
  total: number | null;
}

type Mode = 'initial' | 'refresh' | 'silent';

/**
 * Offset pagination for a Supabase list. `fetchPage(from, to)` must run the query with `.range(from, to)` and a
 * STABLE order (add a unique tiebreaker such as `id`). Changing anything in `deps` (search text, filters) restarts
 * from page 1; stale responses from an older query are ignored.
 *
 *  - loading       first page is loading (show a skeleton)
 *  - refreshing    pull-to-refresh
 *  - loadingMore   a later page is loading (show a footer spinner)
 *  - error         the first page failed (show <LoadError/>)
 *  - moreError     a later page failed (show a retry button; the rows already loaded stay)
 */
export function usePaginatedList<T extends { id?: string }>(
  fetchPage: (from: number, to: number) => Promise<Page<T>>,
  deps: ReadonlyArray<unknown>,
  options: { pageSize?: number; reloadOnFocus?: boolean } = {}
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const requestId = useRef(0);
  const rowsRef = useRef<T[]>([]);
  rowsRef.current = rows;
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const moreErrorRef = useRef(false);

  const load = useCallback(
    async (mode: Mode) => {
      const id = ++requestId.current;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      moreErrorRef.current = false;
      setMoreError(false);
      if (mode === 'initial') {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      }
      try {
        const page = await fetchRef.current(0, pageSize - 1);
        if (id !== requestId.current) return;
        setRows(page.rows);
        setTotal(page.total);
        const more = page.total != null ? page.rows.length < page.total : page.rows.length === pageSize;
        hasMoreRef.current = more;
        setHasMore(more);
        setError(null);
      } catch (e: any) {
        if (id !== requestId.current) return;
        // A failed quiet/refresh reload keeps what is on screen and tells the user; only the first load shows an error state.
        if (mode === 'initial') setError(e?.message || 'Something went wrong.');
        else showAlert('Could not refresh', e?.message || 'Something went wrong.');
      } finally {
        if (id === requestId.current) {
          loadingRef.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [pageSize]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load('initial');
  }, deps);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current || moreErrorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const from = rowsRef.current.length;
      const page = await fetchRef.current(from, from + pageSize - 1);
      if (id !== requestId.current) return;
      setRows((prev) => {
        // Offset paging can repeat a row if the data shifted between pages; keep each id once.
        const seen = new Set(prev.map((r) => r.id).filter(Boolean));
        return [...prev, ...page.rows.filter((r) => !r.id || !seen.has(r.id))];
      });
      if (page.total != null) setTotal(page.total);
      const loaded = from + page.rows.length;
      const more = page.total != null ? loaded < page.total : page.rows.length === pageSize;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (e: any) {
      if (id !== requestId.current) return;
      moreErrorRef.current = true;
      setMoreError(true);
      showAlert('Could not load more', e?.message || 'Something went wrong.');
    } finally {
      if (id === requestId.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [pageSize]);

  const retryMore = useCallback(() => {
    moreErrorRef.current = false;
    setMoreError(false);
    loadMore();
  }, [loadMore]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const reload = useCallback(() => load('silent'), [load]);

  // Coming back to a tab: quietly reload page 1 so changes made on other screens show up.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!options.reloadOnFocus) return;
      if (!focusedOnce.current) {
        focusedOnce.current = true; // the mount effect above already loads
        return;
      }
      load('silent');
    }, [load, options.reloadOnFocus])
  );

  return { rows, setRows, total, loading, refreshing, loadingMore, error, moreError, hasMore, loadMore, retryMore, refresh, reload };
}

/** For ScrollView lists (which have no onEndReached): true when the user is within `threshold` px of the bottom. */
export function isNearEnd(
  e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } },
  threshold = 240
) {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
}

/** Returns `value` after it has stopped changing for `delay` ms (search boxes). */
export function useDebouncedValue<V>(value: V, delay = 350): V {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
