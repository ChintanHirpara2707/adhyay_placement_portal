import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { StatCard } from '@/components/StatCard';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { formatCTC, formatDeadline } from '@/lib/format';

interface RecJob {
  id: string;
  title: string;
  ctc: number;
  deadline: string;
  companies: { company_name: string } | null;
}

interface FeedItem {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [completion, setCompletion] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [recommended, setRecommended] = useState<RecJob[]>([]);
  const [activity, setActivity] = useState<FeedItem[]>([]);

  const fetchStudentStats = useCallback(async () => {
    if (!user) return;
    const { data: apps } = await supabase
      .from('applications')
      .select('id, status, job_postings!inner(id)')
      .eq('student_id', user.id);
    const list = (apps as any[]) ?? [];
    setAppCount(list.length);
    setSelectedCount(list.filter((a) => a.status === 'selected').length);
    const appIds = list.map((a) => a.id);
    if (appIds.length > 0) {
      const { data: ivs } = await supabase
        .from('interviews')
        .select('id, date_time')
        .in('application_id', appIds);
      const upcoming = ((ivs as any[]) ?? []).filter((v) => new Date(v.date_time).getTime() >= Date.now());
      setInterviewCount(upcoming.length);
    } else {
      setInterviewCount(0);
    }
  }, [user]);

  const fetchProfileCompletion = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('students')
      .select('full_name, branch, cgpa, phone, skills, resume_url')
      .eq('id', user.id)
      .maybeSingle();
    const s = (data as any) ?? {};
    setFullName(s.full_name ?? '');
    const fields = [s.full_name, s.branch, s.cgpa, s.phone, s.skills?.length ? 'x' : null, s.resume_url];
    const filled = fields.filter((f) => f !== null && f !== undefined && f !== '' && f !== 0).length;
    setCompletion(Math.round((filled / fields.length) * 100));
  }, [user]);

  const fetchRecommendedJobs = useCallback(async () => {
    if (!user) return;
    const { data: student } = await supabase
      .from('students')
      .select('cgpa, branch, backlog_count')
      .eq('id', user.id)
      .maybeSingle();
    const st = student as any;
    if (!st?.branch || st?.cgpa == null) {
      setRecommended([]);
      return;
    }
    const { data: openJobs } = await supabase
      .from('job_postings')
      .select('id, title, ctc, deadline, min_cgpa, eligible_branches, backlog_allowed, companies(company_name)')
      .eq('status', 'open');
    const branch = String(st.branch).trim().toLowerCase();
    const filtered = ((openJobs as any[]) ?? [])
      .filter((j) => {
        const cgpaOk = Number(st.cgpa) >= Number(j.min_cgpa ?? 0);
        const bOk =
          Array.isArray(j.eligible_branches) &&
          j.eligible_branches.some((b: string) => String(b).trim().toLowerCase() === branch);
        const backOk = j.backlog_allowed || Number(st.backlog_count ?? 0) === 0;
        return cgpaOk && bOk && backOk;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
    setRecommended(filtered);
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, message, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setActivity((data as any[]) ?? []);
  }, [user]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        await Promise.all([fetchProfileCompletion(), fetchStudentStats(), fetchRecommendedJobs(), fetchRecentActivity()]);
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [fetchProfileCompletion, fetchStudentStats, fetchRecommendedJobs, fetchRecentActivity]
  );

  useFocusEffect(
    useCallback(() => {
      loadAll(false);
    }, [loadAll])
  );

  return (
    <View style={styles.container}>
      <TopNavbar title="Dashboard" subtitle="Student Overview" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Theme.colors.primaryAccent} />}
      >
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280 }}>
          <Text style={styles.greeting}>Welcome back{fullName ? `, ${fullName.split(' ')[0]}` : ''}</Text>
          <Text style={styles.sub}>Here is your placement snapshot.</Text>
        </MotiView>

        {completion < 100 ? (
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(student)/profile' as any)}>
            <Card style={styles.completeCard} elevation={1}>
              <Card.Content style={styles.completeContent}>
                <View style={styles.completeRow}>
                  <Text style={styles.completeTitle}>Profile {completion}% complete</Text>
                  <Text style={styles.completeLink}>Complete now</Text>
                </View>
                <ProgressBar progress={completion / 100} color={Theme.colors.primaryAccent} style={styles.bar} />
                <Text style={styles.completeHint}>Add CGPA, branch, skills and resume to unlock jobs.</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label="Applications" value={appCount} icon="file-document-outline" delay={40} />
          <StatCard label="Interviews" value={interviewCount} icon="calendar-clock" accent={Theme.colors.warning} sub="upcoming" delay={90} />
          <StatCard label="Selected" value={selectedCount} icon="check-decagram" accent={Theme.colors.success} sub="offers" delay={140} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Jobs</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/jobs' as any)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recommended.length === 0 ? (
          <Card style={styles.emptyCard} elevation={0}>
            <Card.Content>
              <Text style={styles.emptyText}>Complete your profile to get recommendations.</Text>
            </Card.Content>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {recommended.map((j) => (
              <TouchableOpacity
                key={j.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(student)/job/[id]' as any, params: { id: j.id } })}
              >
                <Card style={styles.recCard} elevation={1}>
                  <Card.Content style={styles.recContent}>
                    <Text style={styles.recTitle} numberOfLines={2}>{j.title}</Text>
                    <Text style={styles.recCompany} numberOfLines={1}>{(j.companies as any)?.company_name ?? 'Company'}</Text>
                    <Text style={styles.recMeta}>{formatCTC(j.ctc)} · {formatDeadline(j.deadline)}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.feedCard} elevation={1}>
          <Card.Content style={styles.feedContent}>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>No updates yet. New shortlists and interviews will appear here.</Text>
            ) : (
              activity.map((n) => (
                <ActivityFeedItem key={n.id} icon="bell-outline" message={n.message} timestamp={n.created_at} unread={!n.read} />
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  body: { padding: Theme.spacing.md, gap: Theme.spacing.md, paddingBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: Theme.colors.primaryText },
  sub: { fontSize: 13, color: Theme.colors.secondaryText, marginTop: 2 },
  completeCard: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: Theme.borderRadius.lg },
  completeContent: { gap: 8 },
  completeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completeTitle: { fontWeight: '700', color: Theme.colors.primaryText },
  completeLink: { color: Theme.colors.primaryAccent, fontWeight: '600', fontSize: 13 },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#DBEAFE' },
  completeHint: { fontSize: 12, color: Theme.colors.secondaryText },
  statsRow: { flexDirection: 'row', gap: Theme.spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText, marginTop: 4 },
  seeAll: { color: Theme.colors.primaryAccent, fontWeight: '600', fontSize: 13 },
  hScroll: { gap: 10, paddingVertical: 4 },
  recCard: { width: 230, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  recContent: { gap: 4 },
  recTitle: { fontWeight: '700', color: Theme.colors.primaryText, fontSize: 15 },
  recCompany: { fontSize: 13, color: Theme.colors.secondaryText },
  recMeta: { fontSize: 12, color: Theme.colors.secondaryText, fontWeight: '500' },
  feedCard: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  feedContent: { paddingVertical: 6 },
  emptyCard: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  emptyText: { fontSize: 13, color: Theme.colors.secondaryText, textAlign: 'center', paddingVertical: 8 },
});
