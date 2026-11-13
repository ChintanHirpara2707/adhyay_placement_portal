import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export interface RealtimeSub {
  /** Table in the `public` schema (must be in the supabase_realtime publication, see supabase/16-master.sql). */
  table: string;
  /** Optional PostgREST-style row filter, e.g. `user_id=eq.<uid>`. RLS still applies on top of it. */
  filter?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
}

interface Options {
  /** Set false until the filter values (such as the user id) are known. */
  enabled?: boolean;
  /** Bursts of changes (e.g. a bulk update) trigger a single refresh. */
  debounceMs?: number;
}

/**
 * Calls `onChange` (usually a quiet reload) whenever a subscribed table changes, so the screen updates by itself.
 * The channel exists only while the screen is focused (tabs stay mounted, so this keeps the number of open channels low),
 * and it is always removed on blur / unmount. A connection problem is logged only: the screen keeps working with the
 * normal reload-on-focus and pull-to-refresh.
 */
export function useRealtimeRefresh(subs: RealtimeSub[], onChange: () => void, options: Options = {}) {
  const { enabled = true, debounceMs = 700 } = options;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const key = JSON.stringify(subs);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const fire = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => onChangeRef.current(), debounceMs);
      };

      const channel = supabase.channel(`rt-${Math.random().toString(36).slice(2)}`);
      (JSON.parse(key) as RealtimeSub[]).forEach((s) => {
        channel.on(
          'postgres_changes' as any,
          { event: s.event ?? '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
          fire
        );
      });
      channel.subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[realtime]', status, err?.message ?? '');
      });

      return () => {
        if (timer) clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }, [key, enabled, debounceMs])
  );
}
