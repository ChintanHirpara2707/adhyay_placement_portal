import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { StatusChip, PageHeader, pageColumn } from '@/components/ui/kit';
import { EmptyState } from '@/components/ui/kit';
import { formatDateTime } from '@/lib/format';

interface InterviewRow {
  id: string;
  application_id: string;
  round_number: number;
  date_time: string;
  mode: string;
  notes: string | null;
  result: string | null;
  jobTitle: string;
  companyName: string;
  currentRound: number;
  totalRounds: number;
  roundNames: string[];
}

export default function StudentInterviewsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);

  const fetchStudentInterviews = useCallback(async () => {
    if (!user) return [];
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select('id, current_round, job_postings(title, total_rounds, round_names, companies(company_name))')
      .eq('student_id', user.id);
    if (appsError) throw appsError;
    const appList = (apps as any[]) ?? [];
    if (appList.length === 0) return [];
    const meta = new Map(appList.map((a) => [a.id, a]));
    const { data: ivs, error: ivError } = await supabase
      .from('interviews')
      .select('id, application_id, round_number, date_time, mode, notes, result')
      .in('application_id', appList.map((a) => a.id))
      .order('date_time', { ascending: true });
    if (ivError) throw ivError;
    return ((ivs as any[]) ?? []).map((v) => {
      const m = meta.get(v.application_id);
      return {
        id: v.id,
        application_id: v.application_id,
        round_number: v.round_number,
        date_time: v.date_time,
        mode: v.mode,
        notes: v.notes,
        result: v.result ?? null,
        jobTitle: m?.job_postings?.title ?? 'Interview',
        companyName: m?.job_postings?.companies?.company_name ?? '',
        currentRound: m?.current_round ?? v.round_number,
        totalRounds: m?.job_postings?.total_rounds ?? 1,
        roundNames: Array.isArray(m?.job_postings?.round_names) ? m.job_postings.round_names : [],
      };
    });
  }, [user]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const rows = await fetchStudentInterviews();
        setInterviews(rows);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to load interviews.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, fetchStudentInterviews]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const splitUpcomingVsPast = (list: InterviewRow[]) => {
    const now = Date.now();
    return {
      upcoming: list.filter((v) => new Date(v.date_time).getTime() >= now),
      past: list.filter((v) => new Date(v.date_time).getTime() < now).reverse(),
    };
  };

  const { upcoming, past } = splitUpcomingVsPast(interviews);
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={styles.container}>
      <TopNavbar title="Interviews" subtitle="Schedule & rounds" />
      <PageHeader title="Interviews" subtitle="Your scheduled rounds and results." />
      <View style={styles.toggleWrap}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { value: 'past', label: `Past (${past.length})` },
          ]}
        />
      </View>
      {loading ? (
        <View style={styles.list}>
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.accent} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.round}>Round {item.round_number}</Text>
                <StatusChip label={String(item.mode).toUpperCase()} tone={item.mode === 'online' ? 'accent' : 'success'} />
              </View>
              <Text style={styles.progress}>
                Round {item.currentRound} of {item.totalRounds}
                {item.roundNames[item.currentRound - 1] ? `: ${item.roundNames[item.currentRound - 1]}` : ''}
              </Text>
              <Text style={styles.job} numberOfLines={2}>{item.jobTitle}</Text>
              {item.companyName ? <Text style={styles.company} numberOfLines={1}>{item.companyName}</Text> : null}
              <Text style={styles.date}>{formatDateTime(item.date_time)}</Text>
              {item.notes ? <Text style={styles.notes} numberOfLines={3}>{item.notes}</Text> : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-clock-outline"
              title={tab === 'upcoming' ? 'No upcoming interviews' : 'No past interviews'}
              hint={tab === 'upcoming' ? 'Scheduled rounds will appear here.' : 'Completed rounds will appear here.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  toggleWrap: { ...pageColumn(720), paddingTop: 8, paddingBottom: 12 },
  list: { ...pageColumn(720), paddingBottom: 24, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  round: { fontSize: 16, fontWeight: '600', color: C.ink, letterSpacing: -0.3 },
  progress: { fontSize: 12, fontWeight: '600', color: C.teal },
  job: { fontSize: 15, fontWeight: '600', color: C.ink },
  company: { fontSize: 13, color: C.muted },
  date: { fontSize: 13, color: C.accentStrong, fontWeight: '600' },
  notes: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 20 },
});
