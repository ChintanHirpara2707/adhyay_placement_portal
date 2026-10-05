import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Card, Text, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Theme.colors.primaryAccent} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280, delay: Math.min(index * 50, 250) }}>
              <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.round}>Round {item.round_number}</Text>
                    <View style={[styles.modePill, { backgroundColor: item.mode === 'online' ? '#E0F7FA' : '#E8F5E9' }]}>
                      <Text style={[styles.modeText, { color: item.mode === 'online' ? Theme.colors.primaryAccent : '#2E7D32' }]}>
                        {String(item.mode).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.progress}>
                    Round {item.currentRound} of {item.totalRounds}
                    {item.roundNames[item.currentRound - 1] ? `: ${item.roundNames[item.currentRound - 1]}` : ''}
                  </Text>
                  <Text style={styles.job}>{item.jobTitle}</Text>
                  {item.companyName ? <Text style={styles.company}>{item.companyName}</Text> : null}
                  <Text style={styles.date}>{formatDateTime(item.date_time)}</Text>
                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                </Card.Content>
              </Card>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{tab === 'upcoming' ? 'No upcoming interviews.' : 'No past interviews.'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  toggleWrap: { paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.sm },
  list: { padding: Theme.spacing.md, gap: Theme.spacing.sm },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.sm },
  cardContent: { padding: Theme.spacing.md, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText },
  progress: { fontSize: 12, fontWeight: '700', color: '#0F766E' },
  modePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Theme.borderRadius.pill },
  modeText: { fontSize: 10, fontWeight: '700' },
  job: { fontSize: 14, fontWeight: '600', color: Theme.colors.primaryText },
  company: { fontSize: 13, color: Theme.colors.secondaryText },
  date: { fontSize: 13, color: Theme.colors.primaryAccent, fontWeight: '600' },
  notes: { fontSize: 12, color: Theme.colors.secondaryText, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60, padding: Theme.spacing.xl },
  emptyText: { fontSize: 14, color: Theme.colors.secondaryText, textAlign: 'center' },
});
