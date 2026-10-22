import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, Linking, RefreshControl } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { StatusChip, statusToneFor, EmptyState, PageHeader, FilterChips, pageColumn } from '@/components/ui/kit';

interface Applicant {
  id: string;
  status: string;
  applied_at: string;
  student_id: string;
  students: {
    full_name: string;
    cgpa: number;
    branch: string;
    resume_url: string | null;
  } | null;
  job_postings: {
    title: string;
  } | null;
}

export default function JobApplicantsScreen() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { jobId } = useLocalSearchParams();

  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('applicants');
  useScreenReady(!loading);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'applied' | 'shortlisted' | 'rejected'>('all');

  const fetchApplicantsForJob = async (isRefresh = false) => {
    if (!jobId) return;
    begin(isRefresh);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          student_id,
          students (
            full_name,
            cgpa,
            branch,
            resume_url
          ),
          job_postings (
            title
          )
        `)
        .eq('job_id', jobId);

      if (error) throw error;

      const list = data as any[] || [];
      setApplicants(list);

      if (list.length > 0 && list[0].job_postings) {
        setJobTitle(list[0].job_postings.title);
      } else {
        // Fallback fetch job details to get title if no applicants yet
        const { data: jobData, error: jobError } = await supabase
          .from('job_postings')
          .select('title')
          .eq('id', jobId)
          .single();
        if (jobError) {
          console.error('Failed to fetch job details in fallback:', jobError.message);
        }
        if (jobData) {
          setJobTitle(jobData.title);
        }
      }
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  };

  // Refetch on focus so statuses changed on the applicant screen (interview scheduled, rejected...) are current.
  useFocusEffect(
    useCallback(() => {
      fetchApplicantsForJob();
    }, [jobId])
  );

  // Applicant ids with a status change in flight, so a double tap cannot send two updates/notifications.
  const busyRef = useRef<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<string[]>([]);
  // Which action is running per id, so only the pressed button shows its spinner.
  const [busyKinds, setBusyKinds] = useState<Record<string, string>>({});
  const setBusy = (id: string, on: boolean, kind?: string) => {
    if (on) busyRef.current.add(id);
    else busyRef.current.delete(id);
    setBusyIds(Array.from(busyRef.current));
    setBusyKinds((prev) => {
      const next = { ...prev };
      if (on && kind) next[id] = kind;
      else delete next[id];
      return next;
    });
  };

  const filterByStatus = (list: Applicant[]) => (filter === 'all' ? list : list.filter((a) => a.status === filter));
  const visible = filterByStatus(applicants);

  const handleUpdateStatus = async (applicant: Applicant, newStatus: 'shortlisted' | 'rejected') => {
    if (busyRef.current.has(applicant.id)) return;
    setBusy(applicant.id, true, newStatus);
    try {
      // 1. Update application status (select() so a row filtered out by RLS is detected, not silently "successful")
      const { data: updated, error: updateError } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicant.id)
        .select('id');

      if (updateError) {
        showAlert('Error', 'Failed to update applicant status: ' + updateError.message);
        return;
      }
      if (!updated || updated.length === 0) {
        showAlert('Status not changed', NO_ROWS_MESSAGE);
        return;
      }

      // 2. Insert notification
      const message = newStatus === 'shortlisted'
        ? `Congratulations! You have been shortlisted for the job "${jobTitle}".`
        : `Thank you for applying. Unfortunately, your application for "${jobTitle}" was not selected.`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: applicant.student_id,
          message: message,
          read: false,
        });

      // 3. Update state locally
      setApplicants((prev) =>
        prev.map((app) => (app.id === applicant.id ? { ...app, status: newStatus } : app))
      );

      if (notifError) {
        showAlert(
          'Status updated, student not notified',
          `The applicant is now ${newStatus}, but the notification could not be sent: ${notifError.message}`
        );
      } else {
        showAlert('Success', `Applicant has been ${newStatus}.`);
      }
    } catch (e: any) {
      showAlert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setBusy(applicant.id, false);
    }
  };

  const handleShortlist = async (applicant: Applicant) => handleUpdateStatus(applicant, 'shortlisted');
  const handleReject = (applicant: Applicant) =>
    showAlert('Reject applicant?', `${applicant.students?.full_name ?? 'This applicant'} will be told their application was not selected.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => handleUpdateStatus(applicant, 'rejected') },
    ]);

  const STATUS_LABELS: Record<string, string> = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
    round_cleared: 'Round Cleared',
  };

  return (
    <View style={styles.container}>
      <TopNavbar title="Applicants" subtitle={jobTitle || 'Job applicants'} showBack />
      <PageHeader title={jobTitle || 'Job position'} subtitle={loading ? 'Loading candidates…' : `${visible.length} ${visible.length === 1 ? 'candidate' : 'candidates'}`} />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={(['all', 'applied', 'shortlisted', 'rejected'] as const).map((f) => ({
          value: f,
          label: f[0].toUpperCase() + f.slice(1),
        }))}
      />

      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="application" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => fetchApplicantsForJob()} />
        </View>
      ) : (
        <FlatList
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchApplicantsForJob(true)} tintColor={C.accent} />}
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {item.students?.full_name || 'Incomplete Profile'}
              </Text>
              <StatusChip label={STATUS_LABELS[item.status] ?? item.status} tone={statusToneFor(item.status)} />
            </View>
            <Text style={styles.detailText} numberOfLines={1}>
              {item.students?.branch || 'N/A'} · CGPA {item.students?.cgpa ?? 'N/A'}
            </Text>

            <View style={styles.actionsRow}>
                {item.students?.resume_url && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => Linking.openURL(item.students!.resume_url!)}
                    icon="file-pdf-box"
                    textColor={C.accent}
                    style={styles.resumeBtn}
                  >
                    Resume
                  </Button>
                )}

                {item.status === 'applied' && (
                  <View style={styles.decisionButtons}>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleShortlist(item)}
                      loading={busyKinds[item.id] === 'shortlisted'}
                      disabled={busyIds.includes(item.id)}
                      style={styles.shortlistBtn}
                      buttonColor={C.accent}
                      textColor="#FFFFFF"
                    >
                      Shortlist
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => handleReject(item)}
                      loading={busyKinds[item.id] === 'rejected'}
                      disabled={busyIds.includes(item.id)}
                      style={styles.rejectBtn}
                      textColor={C.danger}
                    >
                      Reject
                    </Button>
                  </View>
                )}
                <Button
                  mode="text"
                  compact
                  onPress={() => nav.push({ pathname: '/(company)/applicant/[id]' as any, params: { id: item.id } })}
                  textColor={C.accent}
                >
                  View & Interview
                </Button>
              </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="account-search-outline"
            title="No applications yet"
            hint="No applications received for this job yet."
          />
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.paper,
  },
  loadingText: {
    marginTop: 12,
    color: C.muted,
    fontSize: 14,
  },
  listContainer: {
    ...pageColumn(720),
    paddingBottom: 24,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  detailText: {
    fontSize: 14,
    color: C.muted,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: C.line,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 4,
  },
  resumeBtn: {
    borderRadius: 10,
    borderColor: C.line,
  },
  decisionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortlistBtn: {
    borderRadius: 10,
  },
  rejectBtn: {
    borderRadius: 10,
    borderColor: C.line,
  },
});
