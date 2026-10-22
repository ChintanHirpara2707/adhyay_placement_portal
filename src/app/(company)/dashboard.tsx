import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, RefreshControl, TouchableOpacity } from 'react-native';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, EmptyState } from '@/components/ui/kit';
import { StatSummary } from '@/components/StatSummary';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';

/** Matches the approved dashboard: heading, summary, action buttons, recent activity. */
function CompanyDashboardSkeleton() {
  return (
    <>
      <View style={{ gap: 6 }}>
        <Skeleton width={200} height={28} />
        <Skeleton width={230} height={16} />
      </View>
      <SkeletonCard variant="stat" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton height={46} borderRadius={10} style={{ flex: 1 }} />
        <Skeleton height={46} borderRadius={10} style={{ flex: 1 }} />
      </View>
      <Skeleton width={150} height={20} />
      <SkeletonList count={2} variant="notification" />
    </>
  );
}

export default function CompanyDashboard() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { user } = useAuthStore();
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('your dashboard');
  useScreenReady(!loading);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [activeJobs, setActiveJobs] = useState(0);
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [shortlisted, setShortlisted] = useState(0);
  const [recent, setRecent] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const checkApprovalStatus = useCallback(async () => {
    if (!user) return false;
    const { data, error } = await supabase.from('companies').select('approved, company_name').eq('id', user.id).maybeSingle();
    if (error) throw error;
    setApproved((data as any)?.approved ?? false);
    setCompanyName((data as any)?.company_name ?? '');
    return (data as any)?.approved === true;
  }, [user]);

  const fetchCompanyStats = useCallback(async () => {
    if (!user) return;
    const { data: jobs, error: qErr1 } = await supabase.from('job_postings').select('id, status').eq('company_id', user.id);
    if (qErr1) throw qErr1;
    const list = (jobs as any[]) ?? [];
    setActiveJobs(list.filter((j) => j.status === 'open').length);
    if (list.length === 0) {
      setTotalApplicants(0);
      setShortlisted(0);
      return;
    }
    const jobIds = list.map((j) => j.id);
    const { data: apps, error: qErr2 } = await supabase.from('applications').select('id, status').in('job_id', jobIds);
    if (qErr2) throw qErr2;
    const aList = (apps as any[]) ?? [];
    setTotalApplicants(aList.length);
    setShortlisted(aList.filter((a) => a.status === 'shortlisted' || a.status === 'selected').length);
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    const { data: jobs, error: qErr3 } = await supabase.from('job_postings').select('id, title').eq('company_id', user.id);
    if (qErr3) throw qErr3;
    const jobIds = ((jobs as any[]) ?? []).map((j) => j.id);
    if (jobIds.length === 0) {
      setRecent([]);
      return;
    }
    const { data: apps, error: qErr4 } = await supabase
      .from('applications')
      .select('id, applied_at, status, students(full_name), job_postings(title)')
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false })
      .limit(5);
    if (qErr4) throw qErr4;
    const items = ((apps as any[]) ?? []).map((a) => ({
      id: a.id,
      message: `${a.students?.full_name ?? 'A candidate'} applied for ${a.job_postings?.title ?? 'a job'} (${a.status})`,
      created_at: a.applied_at,
    }));
    setRecent(items);
  }, [user]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      begin(isRefresh);
      try {
        const ok = await checkApprovalStatus();
        if (ok) await Promise.all([fetchCompanyStats(), fetchRecentActivity()]);
        succeed();
      } catch (e: any) {
        fail(e);
      } finally {
        end();
      }
    },
    [checkApprovalStatus, fetchCompanyStats, fetchRecentActivity, begin, succeed, fail, end]
  );

  useFocusEffect(
    useCallback(() => {
      loadAll(false);
    }, [loadAll])
  );

  return (
    <View style={styles.shell}>
      <TopNavbar title="Dashboard" subtitle={companyName || 'Recruiter overview'} />
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={C.accent} />}
      >
        {loading ? (
          <CompanyDashboardSkeleton />
        ) : loadError ? (
          <LoadError message={loadError} onRetry={() => loadAll()} />
        ) : approved === false ? (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
            <Card>
              <View style={styles.pendingContent}>
                <View style={styles.pendingIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color={C.warning} />
                </View>
                <Text style={styles.pendingTitle}>Approval pending</Text>
                <Text style={styles.pendingText}>
                  Your company profile is awaiting administrator review. You can post jobs after approval.
                </Text>
                <Button mode="outlined" onPress={() => loadAll(true)} textColor={C.accent} style={styles.checkBtn}>
                  Check Approval Status
                </Button>
              </View>
            </Card>
          </MotiView>
        ) : (
          <>
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
              <Text style={styles.heading}>{companyName || 'Dashboard'}</Text>
              <Text style={styles.sub}>Your hiring activity at a glance.</Text>
            </MotiView>
            <StatSummary
              items={[
                { label: 'Active jobs', value: activeJobs },
                { label: 'Applicants', value: totalApplicants },
                { label: 'Shortlisted', value: shortlisted },
              ]}
            />
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                icon="plus"
                buttonColor={C.accent}
                textColor="#FFFFFF"
                style={styles.actionBtn}
                contentStyle={styles.postBtnContent}
                labelStyle={styles.postBtnLabel}
                onPress={() => nav.push('/(company)/post-job' as any)}
              >
                Post a job
              </Button>
              <Button
                mode="outlined"
                icon="briefcase-outline"
                textColor={C.accent}
                style={[styles.actionBtn, styles.actionOutline]}
                contentStyle={styles.postBtnContent}
                labelStyle={styles.postBtnLabel}
                onPress={() => nav.push('/(company)/my-jobs' as any)}
              >
                View my jobs
              </Button>
            </View>
            <SectionHeader
              title="Recent activity"
              action={
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => nav.push('/(company)/my-jobs' as any)}
                  accessibilityRole="link"
                  accessibilityLabel="Go to my jobs"
                >
                  <Text style={styles.link}>My jobs</Text>
                </TouchableOpacity>
              }
            />
            <Card>
              {recent.length === 0 ? (
                <EmptyState icon="account-plus-outline" title="No applicants yet" hint="Post a job to start receiving applications." />
              ) : (
                recent.map((r) => <ActivityFeedItem key={r.id} icon="account-plus-outline" message={r.message} timestamp={r.created_at} />)
              )}
            </Card>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  heading: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2 },
  loading: { textAlign: 'center', color: C.muted, marginTop: 40 },
  pendingContent: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  pendingIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.warningSoft, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  pendingText: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 420 },
  checkBtn: { borderRadius: 10, marginTop: 8, borderColor: C.line },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flexGrow: 1, flexBasis: 150, borderRadius: 10 },
  actionOutline: { borderColor: C.line },
  postBtnContent: { paddingVertical: 8, minHeight: 48 },
  postBtnLabel: { fontSize: 16, fontWeight: '600' },
  linkBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: C.accent, fontWeight: '600', fontSize: 14 },
});
