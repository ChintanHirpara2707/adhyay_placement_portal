import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { StatCard } from '@/components/StatCard';
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
    <View style={styles.container}>
      <TopNavbar title="Dashboard" subtitle={companyName || 'Recruiter overview'} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Theme.colors.primaryAccent} />}
      >
        {checking ? (
          <Text style={styles.loading}>Verifying company account…</Text>
        ) : approved === false ? (
          <MotiView from={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 280 }}>
            <Card style={styles.pending} elevation={1}>
              <Card.Content style={styles.pendingContent}>
                <Text style={styles.pendingTitle}>Approval Pending</Text>
                <Text style={styles.pendingText}>
                  Your company profile is awaiting administrator review. You can post jobs after approval.
                </Text>
                <Button mode="outlined" onPress={() => loadAll(true)} textColor={Theme.colors.primaryAccent} style={styles.checkBtn}>
                  Check Approval Status
                </Button>
              </Card.Content>
            </Card>
          </MotiView>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Active Jobs" value={activeJobs} icon="briefcase" delay={30} />
              <StatCard label="Applicants" value={totalApplicants} icon="account-multiple" accent={Theme.colors.warning} delay={80} />
              <StatCard label="Shortlisted" value={shortlisted} icon="check-decagram" accent={Theme.colors.success} delay={130} />
            </View>
            <Button
              mode="contained"
              icon="plus"
              buttonColor={Theme.colors.primaryAccent}
              textColor="#fff"
              style={styles.postBtn}
              onPress={() => router.push('/(company)/post-job' as any)}
            >
              Post New Job
            </Button>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.link} onPress={() => router.push('/(company)/my-jobs' as any)}>My Jobs</Text>
            </View>
            <Card style={styles.feed} elevation={1}>
              <Card.Content style={styles.feedContent}>
                {recent.length === 0 ? (
                  <Text style={styles.empty}>No applicants yet. Post a job to start receiving applications.</Text>
                ) : (
                  recent.map((r) => <ActivityFeedItem key={r.id} icon="account-plus-outline" message={r.message} timestamp={r.created_at} />)
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.spacing.md, gap: Theme.spacing.md, paddingBottom: 24 },
  loading: { textAlign: 'center', color: Theme.colors.secondaryText, marginTop: 40 },
  pending: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  pendingContent: { alignItems: 'center', padding: Theme.spacing.xl, gap: 8 },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: Theme.colors.primaryText },
  pendingText: { fontSize: 14, color: Theme.colors.secondaryText, textAlign: 'center', lineHeight: 20 },
  checkBtn: { borderRadius: Theme.borderRadius.md, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: Theme.spacing.sm },
  postBtn: { borderRadius: Theme.borderRadius.button },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText },
  link: { color: Theme.colors.primaryAccent, fontWeight: '600', fontSize: 13 },
  feed: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  feedContent: { paddingVertical: 6 },
  empty: { fontSize: 13, color: Theme.colors.secondaryText, textAlign: 'center', paddingVertical: 10 },
});
