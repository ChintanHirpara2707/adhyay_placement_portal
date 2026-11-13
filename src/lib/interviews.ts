import { supabase } from '@/lib/supabase';
import { parseDbDate } from '@/lib/format';

export interface StudentInterview {
  id: string;
  application_id: string;
  round_number: number;
  date_time: string;
  mode: string;
  notes: string | null;
  result: string | null;
  /** 'scheduled' | 'cancelled' */
  status: string;
  /** Company's reason for the latest reschedule / cancellation, if any. */
  reschedule_note: string | null;
  jobTitle: string;
  companyName: string;
  totalRounds: number;
  /** Name of THIS interview's round (from the job posting), not of the application's current round. */
  roundName: string;
}

/**
 * Single source of truth for a student's interviews, used by the Interviews screen AND the dashboard
 * count so the two can never disagree. Chain: applications -> interviews (+ job/company for labels).
 * Throws on any query error so callers can show it instead of an empty state.
 */
export async function fetchStudentInterviews(studentId: string): Promise<StudentInterview[]> {
  const { data: apps, error: appsError } = await supabase
    .from('applications')
    .select('id, job_postings(title, total_rounds, round_names, companies(company_name))')
    .eq('student_id', studentId);
  if (appsError) throw appsError;
  const appList = (apps as any[]) ?? [];
  if (appList.length === 0) return [];

  const meta = new Map(appList.map((a) => [a.id, a]));
  const { data: ivs, error: ivError } = await supabase
    .from('interviews')
    .select('id, application_id, round_number, date_time, mode, notes, result, status, reschedule_note')
    .in('application_id', appList.map((a) => a.id))
    .order('date_time', { ascending: true });
  if (ivError) throw ivError;

  return ((ivs as any[]) ?? []).map((v) => {
    const job = meta.get(v.application_id)?.job_postings;
    const names: string[] = Array.isArray(job?.round_names) ? job.round_names : [];
    return {
      id: v.id,
      application_id: v.application_id,
      round_number: v.round_number,
      date_time: v.date_time,
      mode: v.mode,
      notes: v.notes,
      result: v.result ?? null,
      status: v.status ?? 'scheduled',
      reschedule_note: v.reschedule_note ?? null,
      jobTitle: job?.title ?? 'Interview',
      companyName: job?.companies?.company_name ?? '',
      totalRounds: job?.total_rounds ?? 1,
      roundName: names[v.round_number - 1] ?? '',
    };
  });
}

/**
 * Upcoming = starts now or later AND not cancelled. Past = already started, or cancelled (so a cancelled
 * interview leaves the upcoming list and the dashboard count). Same timezone-safe parse as everything else.
 */
export function splitInterviews<T extends { date_time: string; status?: string }>(list: T[], now = Date.now()) {
  const isUpcoming = (v: T) => v.status !== 'cancelled' && parseDbDate(v.date_time).getTime() >= now;
  return {
    upcoming: list.filter(isUpcoming),
    past: list.filter((v) => !isUpcoming(v)).reverse(),
  };
}
