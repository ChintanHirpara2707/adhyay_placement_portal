import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C, R } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, StatCard, StatusChip, EmptyState } from '@/components/ui/kit';
import { ResponsiveGrid } from '@/components/ui/kit';
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
    <View style={styles.shell}>
      <TopNavbar title="Dashboard" subtitle="Student Overview" />
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={C.accent} />}
      >
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Text style={styles.greeting}>Welcome back{fullName ? `, ${fullName.split(' ')[0]}` : ''}</Text>
          <Text style={styles.sub}>Here is your placement snapshot.</Text>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 60 }}>
          <View style={styles.hero}>
            {completion < 100 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(student)/profile' as any)}
                accessibilityRole="button"
                accessibilityLabel={`Profile ${completion} percent complete. Open profile to complete it.`}
              >
                <View style={styles.heroRow}>
                  <Text style={styles.heroTitle}>Profile {completion}% complete</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
                </View>
                <ProgressBar progress={completion / 100} color={C.accent} style={styles.bar} />
                <Text style={styles.heroHint}>Add CGPA, branch, skills and resume to unlock jobs.</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.heroTitle}>{recommended.length} {recommended.length === 1 ? 'drive matches' : 'drives match'} you</Text>
                <Text style={styles.heroHint}>Your profile is complete. Keep applying before deadlines.</Text>
              </>
            )}
          </View>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 120 }}>
          <ResponsiveGrid>
            <StatCard label="Applications" value={appCount} icon="file-document-outline" tone="accent" />
            <StatCard label="Interviews" value={interviewCount} icon="calendar-clock" tone="warning" sub="upcoming" />
            <StatCard label="Selected" value={selectedCount} icon="check-decagram" tone="success" sub="offers" />
          </ResponsiveGrid>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 180 }}>
          <SectionHeader
            title="Recommended jobs"
            action={
              <TouchableOpacity
                onPress={() => router.push('/(student)/jobs' as any)}
                style={styles.seeAllBtn}
                accessibilityRole="link"
                accessibilityLabel="See all jobs"
              >
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            }
          />
          {recommended.length === 0 ? (
            <Card>
              <EmptyState icon="briefcase-outline" title="No recommendations yet" hint="Complete your profile to get recommendations." />
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {recommended.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/(student)/job/[id]' as any, params: { id: j.id } })}
                >
                  <Card style={styles.recCard}>
                    <Text style={styles.recTitle} numberOfLines={2}>{j.title}</Text>
                    <Text style={styles.recCompany} numberOfLines={1}>{(j.companies as any)?.company_name ?? 'Company'}</Text>
                    <StatusChip label={formatCTC(j.ctc)} tone="accent" />
                    <Text style={styles.recMeta}>{formatDeadline(j.deadline)}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 240 }}>
          <SectionHeader title="Recent activity" />
          <Card>
            {activity.length === 0 ? (
              <EmptyState icon="bell-outline" title="No updates yet" hint="New shortlists and interviews will appear here." />
            ) : (
              activity.map((n) => (
                <ActivityFeedItem key={n.id} icon="bell-outline" message={n.message} timestamp={n.created_at} unread={!n.read} />
              ))
            )}
          </Card>
        </MotiView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  greeting: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2, lineHeight: 22 },
  hero: { backgroundColor: C.surface, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 18, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 17, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  heroHint: { fontSize: 14, color: C.muted, lineHeight: 20, marginTop: 6 },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.line, marginTop: 10 },
  seeAllBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  seeAll: { color: C.accent, fontWeight: '600', fontSize: 14 },
  hScroll: { gap: 12, paddingVertical: 4 },
  recCard: { width: 240, gap: 6 },
  recTitle: { fontWeight: '600', color: C.ink, fontSize: 16, letterSpacing: -0.2 },
  recCompany: { fontSize: 13, color: C.muted },
  recMeta: { fontSize: 12, color: C.muted, fontWeight: '500' },
});
