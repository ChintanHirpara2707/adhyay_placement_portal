import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl, Platform } from 'react-native';
import { Text, Button, Banner, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';
import { StatusChip } from '@/components/ui/kit';
import { EmptyState } from '@/components/ui/kit';
import { formatCTC, formatDeadline, isDeadlineUrgent } from '@/lib/format';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  ctc: number;
  min_cgpa: number;
  eligible_branches: string[];
  backlog_allowed: boolean;
  deadline: string;
  isApplied?: boolean;
  companies: { company_name: string } | null;
}

export default function StudentJobsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { dismissedIds } = useFeedStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [query, setQuery] = useState('');

  const fetchStudentProfile = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('cgpa, branch, backlog_count')
      .eq('id', user!.id)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  };

  const fetchOpenJobs = async () => {
    const { data, error } = await supabase.from('job_postings').select('*, companies(company_name)').eq('status', 'open');
    if (error) throw error;
    return (data as any[]) ?? [];
  };

  const fetchExistingApplications = async (): Promise<Set<string>> => {
    const { data, error } = await supabase.from('applications').select('job_id').eq('student_id', user!.id);
    if (error) {
      console.warn('Failed to fetch applications:', error.message);
      return new Set();
    }
    return new Set(((data as any[]) ?? []).map((a) => a.job_id));
  };

  const filterJobsByEligibility = (openJobs: any[], student: any) =>
    openJobs.filter((job) => {
      const cgpaOk = Number(student.cgpa) >= Number(job.min_cgpa ?? 0);
      const sb = String(student.branch).trim().toLowerCase();
      const branchOk =
        Array.isArray(job.eligible_branches) &&
        job.eligible_branches.some((b: string) => String(b).trim().toLowerCase() === sb);
      const backlogOk = job.backlog_allowed || Number(student.backlog_count ?? 0) === 0;
      return cgpaOk && branchOk && backlogOk;
    });

  const sortJobsByDeadline = (list: any[]) =>
    [...list].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const navigateToJobDetail = (id: string) => {
    router.push({ pathname: '/(student)/job/[id]' as any, params: { id } });
  };

  const loadData = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const student = await fetchStudentProfile();
      if (!student || student.cgpa == null || !student.branch) {
        setProfileIncomplete(true);
        setJobs([]);
        return;
      }
      setProfileIncomplete(false);
      const [openJobs, appliedIds] = await Promise.all([fetchOpenJobs(), fetchExistingApplications()]);
      const filtered = filterJobsByEligibility(openJobs, student);
      const sorted = sortJobsByDeadline(filtered);
      setJobs(sorted.map((j) => ({ ...j, isApplied: appliedIds.has(j.id) })));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const searchFilter = (list: JobPosting[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        ((j.companies as any)?.company_name ?? '').toLowerCase().includes(q)
    );
  };
  const visible = searchFilter(jobs).filter((j) => !dismissedIds.includes(j.id));

  return (
    <View style={styles.container}>
      <WebOnlyDecorations />
      <TopNavbar title="Job Feed" subtitle="Eligible opportunities" />
      <Banner
        visible={profileIncomplete}
        actions={[{ label: 'Complete Profile', onPress: () => router.push('/(student)/profile' as any) }]}
        icon="alert-circle"
      >
        Your profile is incomplete. Add CGPA and branch to see matching jobs.
      </Banner>
      <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
        <Text style={styles.eyebrow}>Open Drives</Text>
        <Text style={styles.heading}>Find your chapter</Text>
      </MotiView>
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search title or company"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
        />
      </View>
      <Text style={styles.resultCount}>
        {visible.length > 0 ? `${visible.length} opportunities match your profile` : 'No matches'}
      </Text>
      {loading ? (
        <View style={styles.listContainer}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.accent} colors={[C.accent]} />
          }
          renderItem={({ item }) => {
            const urgent = isDeadlineUrgent(item.deadline);
            return (
              <AnimatedPressable onPress={() => navigateToJobDetail(item.id)} scaleTo={0.98}>
                <View style={styles.card}>
                  <View style={styles.titleRow}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
                    {item.isApplied ? <StatusChip label="Applied" tone="muted" /> : null}
                  </View>
                  <Text style={styles.companyName} numberOfLines={1}>{(item.companies as any)?.company_name ?? 'Unknown Company'}</Text>
                  <View style={styles.infoRow}>
                    <StatusChip label={formatCTC(item.ctc)} tone="accent" />
                    <StatusChip label={`Deadline: ${formatDeadline(item.deadline)}`} tone={urgent ? 'warning' : 'muted'} />
                  </View>
                </View>
              </AnimatedPressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase-search-outline"
              title="No matching drives"
              hint="No jobs currently match your eligibility criteria."
              action={
                <Button mode="outlined" onPress={() => loadData()} style={styles.retryButton} textColor={C.accent}>
                  Refresh Opportunities
                </Button>
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.accent, paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -1, paddingHorizontal: 16, marginTop: 4 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, elevation: 0 },
  searchInput: { fontSize: 16 },
  resultCount: { textAlign: 'center', fontSize: 12, color: C.muted, marginVertical: 8 },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
    ...(Platform.OS === 'web' ? ({ maxWidth: 720, alignSelf: 'center', width: '100%' } as any) : null),
  },
  card: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 18, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  jobTitle: { fontSize: 17, fontWeight: '800', color: C.ink, flex: 1, minWidth: 0, flexShrink: 1, letterSpacing: -0.3 },
  companyName: { fontSize: 14, color: C.muted },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  retryButton: { borderRadius: 14, borderColor: C.line, marginTop: 12 },
});
