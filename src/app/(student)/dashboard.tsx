import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { useAuthStore } from '@/store/authStore';
import { C, R } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, StatusChip, EmptyState } from '@/components/ui/kit';
import { StatSummary } from '@/components/StatSummary';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { formatCTC, formatDeadline, parseDbDate } from '@/lib/format';
import { fetchStudentInterviews, splitInterviews } from '@/lib/interviews';

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

/** Same blocks, in the same order and sizes, as the loaded dashboard so nothing jumps when data arrives. */
function DashboardSkeleton() {
  return (
    <>
      <Skeleton height={112} borderRadius={14} />
      <SkeletonCard variant="stat" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton height={46} borderRadius={10} style={{ flex: 1 }} />
        <Skeleton height={46} borderRadius={10} style={{ flex: 1 }} />
      </View>
      <Skeleton width={170} height={20} />
      <SkeletonList count={2} variant="job" />
    </>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { user } = useAuthStore();
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('your dashboard');
  useScreenReady(!loading);
  const [fullName, setFullName] = useState('');
  const [completion, setCompletion] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [recommended, setRecommended] = useState<RecJob[]>([]);
  const [activity, setActivity] = useState<FeedItem[]>([]);

  const fetchStudentStats = useCallback(async () => {
    if (!user) return;
    const { data: apps, error: qErr1 } = await supabase
      .from('applications')
      .select('id, status, job_postings!inner(id)')
      .eq('student_id', user.id);
    if (qErr1) throw qErr1;
    const list = (apps as any[]) ?? [];
    setAppCount(list.length);
    setSelectedCount(list.filter((a) => a.status === 'selected').length);
    // Same query + upcoming/past rule as the Interviews screen, so the two always agree.
    const { upcoming } = splitInterviews(await fetchStudentInterviews(user.id));
    setInterviewCount(upcoming.length);
  }, [user]);

  const fetchProfileCompletion = useCallback(async () => {
    if (!user) return;
    const { data, error: qErr3 } = await supabase
      .from('students')
      .select('full_name, branch, cgpa, phone, skills, resume_url')
      .eq('id', user.id)
      .maybeSingle();
    if (qErr3) throw qErr3;
    const s = (data as any) ?? {};
    setFullName(s.full_name ?? '');
    const fields = [s.full_name, s.branch, s.cgpa, s.phone, s.skills?.length ? 'x' : null, s.resume_url];
    const filled = fields.filter((f) => f !== null && f !== undefined && f !== '' && f !== 0).length;
    setCompletion(Math.round((filled / fields.length) * 100));
  }, [user]);

  const fetchRecommendedJobs = useCallback(async () => {
    if (!user) return;
    const { data: student, error: qErr4 } = await supabase
      .from('students')
      .select('cgpa, branch, backlog_count')
      .eq('id', user.id)
      .maybeSingle();
    if (qErr4) throw qErr4;
    const st = student as any;
    if (!st?.branch || st?.cgpa == null) {
      setRecommended([]);
      return;
    }
    const { data: openJobs, error: qErr5 } = await supabase
      .from('job_postings')
      .select('id, title, ctc, deadline, min_cgpa, eligible_branches, backlog_allowed, companies(company_name)')
      .eq('status', 'open');
    if (qErr5) throw qErr5;
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
      .sort((a, b) => parseDbDate(a.deadline).getTime() - parseDbDate(b.deadline).getTime())
      .slice(0, 3);
    setRecommended(filtered);
  }, [user]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;
    const { data, error: qErr6 } = await supabase
      .from('notifications')
      .select('id, message, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (qErr6) throw qErr6;
    setActivity((data as any[]) ?? []);
  }, [user]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      begin(isRefresh);
      try {
        await Promise.all([fetchProfileCompletion(), fetchStudentStats(), fetchRecommendedJobs(), fetchRecentActivity()]);
        succeed();
      } catch (e: any) {
        fail(e);
      } finally {
        end();
      }
    },
    [fetchProfileCompletion, fetchStudentStats, fetchRecommendedJobs, fetchRecentActivity, begin, succeed, fail, end]
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

        {loading ? (
          <DashboardSkeleton />
        ) : loadError ? (
          <LoadError message={loadError} onRetry={() => loadAll()} />
        ) : (
          <>

          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 60 }}>
            <View style={styles.hero}>
              {completion < 100 ? (
                <View>
                  <Text style={styles.heroTitle}>Profile {completion}% complete</Text>
                  <ProgressBar progress={completion / 100} color={C.accent} style={styles.bar} />
                  <Text style={styles.heroHint}>Add CGPA, branch, skills and resume to unlock jobs.</Text>
                  <Button
                    mode="contained"
                    contentStyle={styles.actionContent}
                    style={[styles.actionBtn, styles.heroBtn]}
                    buttonColor={C.accent}
                    textColor="#FFFFFF"
                    onPress={() => nav.push('/(student)/profile' as any)}
                  >
                    Complete profile
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.heroTitle}>{recommended.length} {recommended.length === 1 ? 'drive matches' : 'drives match'} you</Text>
                  <Text style={styles.heroHint}>Your profile is complete. Keep applying before deadlines.</Text>
                </>
              )}
            </View>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 120 }}>
            <View style={styles.summaryBlock}>
              <StatSummary
                items={[
                  { label: 'Applications', value: appCount },
                  { label: 'Interviews', value: interviewCount, sub: 'upcoming' },
                  { label: 'Selected', value: selectedCount, sub: 'offers' },
                ]}
              />
              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  icon="arrow-right"
                  contentStyle={styles.actionContent}
                  style={styles.actionBtn}
                  buttonColor={C.accent}
                  textColor="#FFFFFF"
                  onPress={() => nav.push('/(student)/applications' as any)}
                >
                  View applications
                </Button>
                <Button
                  mode="outlined"
                  icon="calendar-clock"
                  contentStyle={styles.actionContent}
                  style={[styles.actionBtn, styles.actionOutline]}
                  textColor={C.accent}
                  onPress={() => nav.push('/(student)/interviews' as any)}
                >
                  View interviews
                </Button>
              </View>
            </View>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 180 }}>
            <SectionHeader
              title="Recommended jobs"
              action={
                <TouchableOpacity
                  onPress={() => nav.push('/(student)/jobs' as any)}
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
                    onPress={() => nav.push({ pathname: '/(student)/job/[id]' as any, params: { id: j.id } })}
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
            </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  greeting: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2, lineHeight: 22 },
  hero: { backgroundColor: C.surface, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 18, gap: 6 },
  summaryBlock: { gap: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flexGrow: 1, flexBasis: 150, borderRadius: R.button },
  actionOutline: { borderColor: C.line },
  actionContent: { minHeight: 46 },
  heroBtn: { marginTop: 14, flexGrow: 0, alignSelf: 'flex-start', flexBasis: 'auto' },
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
