import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { Text, Button, FAB, Switch } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Skeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { StatusChip, EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  applications: { id: string }[];
}

export default function CompanyMyJobsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  const fetchCompanyJobs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title, status, created_at, applications(id)')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setJobs(((data as any[]) ?? []).map((j) => ({ ...j, applications: j.applications ?? [] })));
  };

  const fetchApplicantCountPerJob = (job: JobPosting) => job.applications?.length ?? 0;

  const loadJobs = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoadingJobs(true);
        await fetchCompanyJobs();
      } catch (e: any) {
        showAlert('Error', e.message || 'Failed to retrieve job postings.');
      } finally {
        setLoadingJobs(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const toggleStatus = async (job: JobPosting) => {
    const next = job.status === 'open' ? 'closed' : 'open';
    const { data, error } = await supabase.from('job_postings').update({ status: next }).eq('id', job.id).select('id');
    if (error || !data || data.length === 0) {
      showAlert('Error', 'Failed to update status: ' + (error?.message ?? NO_ROWS_MESSAGE));
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
  };

  return (
    <View style={styles.container}>
      <TopNavbar title="My Jobs" subtitle="Manage postings" />
      <PageHeader title="My jobs" subtitle="Manage your postings and review applicants." />
      {loadingJobs ? (
        <View style={styles.listContainer}>
          <Skeleton height={110} borderRadius={14} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={14} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={14} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} tintColor={C.accent} colors={[C.accent]} />}
          renderItem={({ item }) => (
            <AnimatedPressable onPress={() => router.push({ pathname: '/(company)/applicants/[jobId]' as any, params: { jobId: item.id } })} scaleTo={0.98}>
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
                  <StatusChip label={item.status === 'open' ? 'Open' : 'Closed'} tone={item.status === 'open' ? 'success' : 'muted'} />
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.applicantCount}>Applicants: <Text style={styles.boldText}>{fetchApplicantCountPerJob(item)}</Text></Text>
                  <Text style={styles.dateText}>Posted: {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{item.status === 'open' ? 'Open' : 'Closed'}</Text>
                  <Switch value={item.status === 'open'} onValueChange={() => toggleStatus(item)} color={C.accent} />
                </View>
              </View>
            </AnimatedPressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-plus-outline"
              title="No postings yet"
              hint="Create your first job posting to start receiving applications."
              action={
                <Button mode="contained" onPress={() => router.push('/(company)/post-job' as any)} style={styles.postButton} buttonColor={C.accent} textColor="#FFFFFF">
                  Create Your First Job Posting
                </Button>
              }
            />
          }
        />
      )}
      <FAB icon="plus" accessibilityLabel="Post a new job" style={styles.fab} color="#FFFFFF" onPress={() => router.push('/(company)/post-job' as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  listContainer: { ...pageColumn(720), paddingBottom: 96, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: C.ink, flex: 1, minWidth: 0, flexShrink: 1, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  applicantCount: { fontSize: 13, color: C.muted },
  boldText: { fontWeight: '700', color: C.ink },
  dateText: { fontSize: 12, color: C.muted },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  toggleLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  postButton: { borderRadius: 10, marginTop: 12 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: C.accent, borderRadius: 14 },
});
