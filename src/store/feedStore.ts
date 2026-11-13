import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';

/**
 * Saved / hidden drives, stored per student in `student_job_prefs` so they follow the account across devices.
 * Updates are optimistic: the UI changes at once and is rolled back (with a visible message) if the write fails.
 */
interface FeedState {
  savedIds: string[];
  /** Drives the student marked "Not interested" (kept under the old name so existing readers keep working). */
  dismissedIds: string[];
  loadedFor: string | null;
  loadPrefs: (studentId: string) => Promise<void>;
  setSaved: (studentId: string, jobId: string, saved: boolean) => Promise<boolean>;
  setHidden: (studentId: string, jobId: string, hidden: boolean) => Promise<boolean>;
  isSaved: (jobId: string) => boolean;
  isDismissed: (jobId: string) => boolean;
  reset: () => void;
}

const toggle = (list: string[], id: string, on: boolean) => {
  const has = list.includes(id);
  if (on && !has) return [...list, id];
  if (!on && has) return list.filter((x) => x !== id);
  return list;
};

export const useFeedStore = create<FeedState>((set, get) => {
  const write = async (
    studentId: string,
    jobId: string,
    field: 'saved' | 'hidden',
    value: boolean,
    key: 'savedIds' | 'dismissedIds'
  ) => {
    const previous = get()[key];
    set({ [key]: toggle(previous, jobId, value) } as Partial<FeedState>);
    // Only the changed column is sent, so the other flag on the same row is left untouched.
    const { error } = await supabase
      .from('student_job_prefs')
      .upsert(
        { student_id: studentId, job_id: jobId, [field]: value, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,job_id' }
      );
    if (error) {
      set({ [key]: previous } as Partial<FeedState>);
      showAlert('Could not save', error.message);
      return false;
    }
    return true;
  };

  return {
    savedIds: [],
    dismissedIds: [],
    loadedFor: null,
    loadPrefs: async (studentId) => {
      // Never show another account's prefs while this student's are loading (shared device).
      if (get().loadedFor !== studentId) set({ savedIds: [], dismissedIds: [], loadedFor: null });
      const { data, error } = await supabase.from('student_job_prefs').select('job_id, saved, hidden').eq('student_id', studentId);
      if (error) {
        console.warn('[feed] prefs load failed:', error.message);
        return;
      }
      const rows = (data as any[]) ?? [];
      set({
        savedIds: rows.filter((r) => r.saved).map((r) => r.job_id),
        dismissedIds: rows.filter((r) => r.hidden).map((r) => r.job_id),
        loadedFor: studentId,
      });
    },
    setSaved: (studentId, jobId, saved) => write(studentId, jobId, 'saved', saved, 'savedIds'),
    setHidden: (studentId, jobId, hidden) => write(studentId, jobId, 'hidden', hidden, 'dismissedIds'),
    isSaved: (jobId) => get().savedIds.includes(jobId),
    isDismissed: (jobId) => get().dismissedIds.includes(jobId),
    reset: () => set({ savedIds: [], dismissedIds: [], loadedFor: null }),
  };
});
