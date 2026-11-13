import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Linking } from 'react-native';
import { Text, SegmentedButtons, Button } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { SkeletonList } from '@/components/loading/Skeleton';
import { useScreenReady } from '@/hooks/useScreenReady';
import { StatusChip, PageHeader, EmptyState, ErrorState, pageColumn } from '@/components/ui/kit';
import { formatDateTime } from '@/lib/format';
import { fetchStudentInterviews, splitInterviews, StudentInterview } from '@/lib/interviews';

const RESULT_LABEL: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  cleared: { label: 'Cleared', tone: 'success' },
  rejected: { label: 'Not selected', tone: 'danger' },
};

export default function StudentInterviewsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('upcoming');
  const [interviews, setInterviews] = useState<StudentInterview[]>([]);
  useScreenReady(!loading);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setInterviews(await fetchStudentInterviews(user.id));
        setError(null);
      } catch (e: any) {
        // Shown as an error state (not an empty list) so a failed query is never mistaken for "no interviews".
        setError(e?.message || 'Failed to load interviews.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const { upcoming, past } = splitInterviews(interviews);
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
          <SkeletonList count={3} variant="interview" />
        </View>
      ) : error ? (
        <View style={styles.list}>
          <ErrorState
            title="Could not load interviews"
            hint={error}
            action={
              <Button mode="outlined" onPress={() => load()} textColor={C.accent} style={styles.retry}>
                Try again
              </Button>
            }
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.accent} />}
          renderItem={({ item }) => {
            const result = item.result ? RESULT_LABEL[item.result] : undefined;
            return (
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.job} numberOfLines={2}>
                    {item.jobTitle}
                  </Text>
                  <StatusChip label={String(item.mode).toUpperCase()} tone={item.mode === 'online' ? 'accent' : 'success'} />
                </View>
                {item.companyName ? (
                  <Text style={styles.company} numberOfLines={1}>
                    {item.companyName}
                  </Text>
                ) : null}
                <Text style={styles.round}>
                  Round {item.round_number} of {item.totalRounds}
                  {item.roundName ? `: ${item.roundName}` : ''}
                </Text>
                <View style={styles.dateRow}>
                  <MaterialCommunityIcons name="calendar-clock-outline" size={16} color={C.accentStrong} />
                  <Text style={styles.date}>{formatDateTime(item.date_time)}</Text>
                </View>
                {result ? <StatusChip label={result.label} tone={result.tone} /> : null}
                {item.notes?.trim() ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Meeting instructions & notes</Text>
                    <Text style={styles.notes} selectable>
                      {item.notes
                        .trim()
                        .split(/(https?:\/\/[^\s]+)/g)
                        .map((part, i) =>
                          /^https?:\/\//.test(part) ? (
                            <Text key={i} style={styles.link} onPress={() => Linking.openURL(part)}>
                              {part}
                            </Text>
                          ) : (
                            part
                          )
                        )}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-clock-outline"
              title={tab === 'upcoming' ? 'No upcoming interviews' : 'No past interviews'}
              hint={
                interviews.length === 0
                  ? 'When a company schedules a round for one of your applications, it will appear here.'
                  : tab === 'upcoming'
                    ? 'Nothing is scheduled right now. Check the Past tab for earlier rounds.'
                    : 'Completed rounds will appear here.'
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
  toggleWrap: { ...pageColumn(720), paddingTop: 8, paddingBottom: 12 },
  list: { ...pageColumn(720), paddingBottom: 24, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  job: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  company: { fontSize: 14, color: C.muted },
  round: { fontSize: 13, fontWeight: '600', color: C.teal },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 14, color: C.accentStrong, fontWeight: '600' },
  notesBox: { marginTop: 4, gap: 2, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 10 },
  notesLabel: { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 0.4 },
  notes: { fontSize: 13, color: C.ink, lineHeight: 20 },
  link: { color: C.accent, textDecorationLine: 'underline' },
  retry: { borderColor: C.line, marginTop: 8 },
});
