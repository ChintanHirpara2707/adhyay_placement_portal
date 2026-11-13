import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text, Button, Banner, Searchbar, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { StatusChip, EmptyState, PageHeader, FilterChips, pageColumn } from '@/components/ui/kit';
import { formatCTC, formatDeadline, isDeadlineUrgent, parseDbDate } from '@/lib/format';

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
  companies: { company_name: string; logo_url?: string | null } | null;
}

export default function StudentJobsScreen() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { user } = useAuthStore();
  const { dismissedIds, savedIds, loadPrefs, setSaved } = useFeedStore();
  const [view, setView] = useState<'all' | 'saved'>('all');
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('jobs');
  useScreenReady(!loading);
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
    const { data, error } = await supabase.from('job_postings').select('*, companies(company_name, logo_url)').eq('status', 'open');
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
    [...list].sort((a, b) => parseDbDate(a.deadline).getTime() - parseDbDate(b.deadline).getTime());

  const navigateToJobDetail = (id: string) => {
    nav.push({ pathname: '/(student)/job/[id]' as any, params: { id } });
  };

  const loadData = async (isRefresh = false) => {
    if (!user) return;
    begin(isRefresh);try {
      const student = await fetchStudentProfile();
      if (!student || student.cgpa == null || !student.branch) {
        setProfileIncomplete(true);
        setJobs([]);
        succeed();
        return;
      }
      setProfileIncomplete(false);
      const [openJobs, appliedIds] = await Promise.all([fetchOpenJobs(), fetchExistingApplications(), loadPrefs(user.id)]);
      const filtered = filterJobsByEligibility(openJobs, student);
      const sorted = sortJobsByDeadline(filtered);
      setJobs(sorted.map((j) => ({ ...j, isApplied: appliedIds.has(j.id) })));
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  // Live: newly posted / closed drives and your own registrations.
  useRealtimeRefresh(
    [{ table: 'job_postings' }, { table: 'applications', filter: `student_id=eq.${user?.id}` }],
    () => loadData(),
    { enabled: !!user }
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
  const visible = searchFilter(jobs).filter(
    (j) => !dismissedIds.includes(j.id) && (view === 'all' || savedIds.includes(j.id))
  );

  return (
    <View style={styles.container}>
      <TopNavbar title="Job Feed" subtitle="Eligible opportunities" />
      <Banner
        visible={profileIncomplete}
        actions={[{ label: 'Complete Profile', onPress: () => nav.push('/(student)/profile' as any) }]}
        icon="alert-circle"
      >
        Your profile is incomplete. Add CGPA and branch to see matching jobs.
      </Banner>
      <PageHeader title="Job feed" subtitle="Open drives you are eligible for." />
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search title or company"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          iconColor={C.muted}
          placeholderTextColor={C.muted}
          accessibilityLabel="Search jobs"
        />
      </View>
      <FilterChips
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: 'All drives' },
          { value: 'saved', label: `Saved (${savedIds.length})` },
        ]}
      />
      <Text style={styles.resultCount}>
        {visible.length > 0 ? `${visible.length} ${visible.length === 1 ? 'opportunity matches' : 'opportunities match'} your profile` : 'No matches'}
      </Text>
      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="job" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => loadData()} />
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
                    <IconButton
                      icon={savedIds.includes(item.id) ? 'bookmark' : 'bookmark-outline'}
                      iconColor={savedIds.includes(item.id) ? C.accent : C.muted}
                      size={22}
                      style={styles.bookmark}
                      accessibilityLabel={savedIds.includes(item.id) ? 'Remove from saved' : 'Save drive'}
                      onPress={() => user && setSaved(user.id, item.id, !savedIds.includes(item.id))}
                    />
                  </View>
                  <View style={styles.companyRow}>
                    <CompanyLogo uri={item.companies?.logo_url} name={item.companies?.company_name} size={32} />
                    <Text style={styles.companyName} numberOfLines={1}>{item.companies?.company_name ?? 'Unknown Company'}</Text>
                  </View>
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
              title={view === 'saved' ? 'No saved drives' : 'No matching drives'}
              hint={
                view === 'saved'
                  ? 'Tap the bookmark on a drive to keep it here.'
                  : 'No jobs currently match your eligibility criteria.'
              }
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
  searchWrap: { ...pageColumn(720), paddingTop: 8 },
  search: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, elevation: 0, minHeight: 48 },
  searchInput: { fontSize: 16 },
  resultCount: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, fontSize: 13, color: C.muted, marginVertical: 10 },
  listContainer: { ...pageColumn(720), paddingBottom: 24, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: C.ink, flex: 1, minWidth: 0, flexShrink: 1, letterSpacing: -0.3 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyName: { flex: 1, minWidth: 0, fontSize: 14, color: C.muted },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  bookmark: { margin: -8 },
  retryButton: { borderRadius: 12, borderColor: C.line, marginTop: 12 },
});
