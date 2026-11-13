import { supabase } from '@/lib/supabase';
import { NO_ROWS_MESSAGE } from '@/lib/alert';

/** Debar / un-debar a student or company. Admin-only via RLS; the select() proves the row was really updated. */
export async function setDebarred(table: 'students' | 'companies', id: string, debarred: boolean): Promise<void> {
  const { data, error } = await supabase.from(table).update({ debarred }).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NO_ROWS_MESSAGE);
}

/** Permanently removes a student/company account and all its data (see supabase/10-admin-manage.sql). */
export async function removeUser(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_user', { target: id });
  if (error) throw error;
}
