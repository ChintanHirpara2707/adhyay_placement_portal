import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl, Platform } from 'react-native';
import { Card, Text, Button, Banner, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';
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
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={Theme.colors.primaryAccent} colors={[Theme.colors.primaryAccent]} />
          }
          renderItem={({ item, index }) => {
            const urgent = isDeadlineUrgent(item.deadline);
            return (
              <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: Math.min(index * 60, 300) }}>
                <AnimatedPressable onPress={() => navigateToJobDetail(item.id)} scaleTo={0.98}>
                  <Card style={styles.card} elevation={1}>
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.titleRow}>
                        <Text style={styles.jobTitle}>{item.title}</Text>
                        {item.isApplied ? (
                          <View style={styles.appliedBadge}>
                            <Text style={styles.appliedBadgeText}>Applied</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.companyName}>🏢 {(item.companies as any)?.company_name ?? 'Unknown Company'}</Text>
                      <View style={styles.infoRow}>
                        <View style={styles.infoTag}>
                          <Text style={styles.infoTagText}>{formatCTC(item.ctc)}</Text>
                        </View>
                        <View style={[styles.infoTag, urgent && styles.urgentTag]}>
                          <Text style={[styles.infoTagText, urgent && styles.urgentText]}>Deadline: {formatDeadline(item.deadline)}</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </AnimatedPressable>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No jobs currently match your eligibility criteria.</Text>
              <Button mode="outlined" onPress={() => loadData()} style={styles.retryButton} textColor={Theme.colors.primaryAccent}>
                Refresh Opportunities
              </Button>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  searchWrap: { paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.sm },
  search: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, elevation: 0 },
  searchInput: { fontSize: 14 },
  resultCount: { textAlign: 'center', fontSize: 12, color: Theme.colors.secondaryText, marginVertical: 8 },
  listContainer: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    ...(Platform.OS === 'web' ? ({ maxWidth: 600, alignSelf: 'center', width: '100%' } as any) : null),
  },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.sm },
  cardContent: { padding: Theme.spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  jobTitle: { fontSize: 17, fontWeight: '700', color: Theme.colors.primaryText, flex: 1 },
  appliedBadge: { backgroundColor: '#E5E7EB', borderRadius: Theme.borderRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  appliedBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  companyName: { fontSize: 14, color: Theme.colors.secondaryText, marginVertical: 4 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, marginTop: Theme.spacing.xs },
  infoTag: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.borderRadius.sm },
  infoTagText: { fontSize: 12, fontWeight: '500', color: Theme.colors.secondaryText },
  urgentTag: { borderColor: Theme.colors.warning, backgroundColor: '#FFFBEB' },
  urgentText: { color: Theme.colors.warning, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: Theme.spacing.xl, marginTop: 40 },
  emptyText: { fontSize: 15, color: Theme.colors.secondaryText, textAlign: 'center', marginBottom: Theme.spacing.lg },
  retryButton: { borderRadius: Theme.borderRadius.md, borderColor: Theme.colors.border },
});
