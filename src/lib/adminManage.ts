import { supabase } from '@/lib/supabase';
import { NO_ROWS_MESSAGE } from '@/lib/alert';

export interface DebarHistoryRow {
  id: string;
  action: 'debarred' | 'undebarred';
  reason: string | null;
  created_at: string;
}

/**
 * Debar / un-debar a student or company. Admin-only via RLS; the select() proves the row was really updated.
 * Debarring stores the reason (shown to the user at sign-in); un-debarring clears it. The audit row in
 * `debar_history` is written by a database trigger.
 */
export async function setDebarred(
  table: 'students' | 'companies',
  id: string,
  debarred: boolean,
  reason?: string
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .update({ debarred, debar_reason: debarred ? (reason ?? '').trim() || null : null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROWS_MESSAGE);
}

/** Newest first. Throws on a query error so the caller can show it. */
export async function fetchDebarHistory(userId: string): Promise<DebarHistoryRow[]> {
  const { data, error } = await supabase
    .from('debar_history')
    .select('id, action, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DebarHistoryRow[]) ?? [];
}

/** Permanently removes a student/company account and all its data (see supabase/10-admin-manage.sql). */
export async function removeUser(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_user', { target: id });
  if (error) throw error;
}
