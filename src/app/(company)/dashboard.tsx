import React, { useCallback, useState } from 'react';
import { StyleSheet, View, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, StatCard, EmptyState, ResponsiveGrid } from '@/components/ui/kit';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';

export default function CompanyDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [activeJobs, setActiveJobs] = useState(0);
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [shortlisted, setShortlisted] = useState(0);
  const [recent, setRecent] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const checkApprovalStatus = useCallback(async () => {
    if (!user) return false;
    const { data, error } = await supabase.from('companies').select('approved, company_name').eq('id', user.id).maybeSingle();
    if (error) {
      Alert.alert('Error', 'Failed to retrieve company status: ' + error.message);
      return false;
    }
    setApproved((data as any)?.approved ?? false);
    setCompanyName((data as any)?.company_name ?? '');
    return (data as any)?.approved === true;
  }, [user]);

  const fetchCompanyStats = useCallback(async () => {
    if (!user) return;
    const { data: jobs } = await supabase.from('job_postings').select('id, status').eq('company_id', user.id);
    const list = (jobs as any[]) ?? [];
    setActiveJobs(list.filter((j) => j.status === 'open').length);
    if (list.length === 0) {
      setTotalApplicants(0);
      setShortlisted(0);
      return;
    }
    const jobIds = list.map((j) => j.id);
    const { data: apps } = await supabase.from('applications').select('id, status').in('job_id', jobIds);
    const aList = (apps as any[]) ?? [];
    setTotalApplicants(aList.length);
    setShortlisted(aList.filter((a) => a.status === 'shortlisted' || a.status === 'selected').length);
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    const { data: jobs } = await supabase.from('job_postings').select('id, title').eq('company_id', user.id);
    const jobIds = ((jobs as any[]) ?? []).map((j) => j.id);
    if (jobIds.length === 0) {
      setRecent([]);
      return;
    }
    const { data: apps } = await supabase
      .from('applications')
      .select('id, applied_at, status, students(full_name), job_postings(title)')
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false })
      .limit(5);
    const items = ((apps as any[]) ?? []).map((a) => ({
      id: a.id,
      message: `${a.students?.full_name ?? 'A candidate'} applied for ${a.job_postings?.title ?? 'a job'} (${a.status})`,
      created_at: a.applied_at,
    }));
    setRecent(items);
  }, [user]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setChecking(true);
      try {
        const ok = await checkApprovalStatus();
        if (ok) await Promise.all([fetchCompanyStats(), fetchRecentActivity()]);
      } finally {
        setChecking(false);
        setRefreshing(false);
      }
    },
    [checkApprovalStatus, fetchCompanyStats, fetchRecentActivity]
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
        {checking ? (
          <Text style={styles.loading}>Verifying company account…</Text>
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
            <ResponsiveGrid>
              <StatCard label="Active Jobs" value={activeJobs} icon="briefcase-outline" tone="accent" />
              <StatCard label="Applicants" value={totalApplicants} icon="account-multiple-outline" tone="warning" />
              <StatCard label="Shortlisted" value={shortlisted} icon="check-decagram" tone="success" />
            </ResponsiveGrid>
            <Button
              mode="contained"
              icon="plus"
              buttonColor={C.accent}
              textColor="#FFFFFF"
              style={styles.postBtn}
              contentStyle={styles.postBtnContent}
              labelStyle={styles.postBtnLabel}
              onPress={() => router.push('/(company)/post-job' as any)}
            >
              Post New Job
            </Button>
            <SectionHeader
              title="Recent activity"
              action={
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => router.push('/(company)/my-jobs' as any)}
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
  postBtn: { borderRadius: 10 },
  postBtnContent: { paddingVertical: 8, minHeight: 48 },
  postBtnLabel: { fontSize: 16, fontWeight: '600' },
  linkBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: C.accent, fontWeight: '600', fontSize: 14 },
});
