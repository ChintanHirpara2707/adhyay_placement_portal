import React, { useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, FAB, Switch } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { Skeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  applications: { id: string }[];
}

export default function CompanyMyJobsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  const fetchCompanyJobs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title, status, created_at, applications(id)')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setJobs(((data as any[]) ?? []).map((j) => ({ ...j, applications: j.applications ?? [] })));
  };

  const fetchApplicantCountPerJob = (job: JobPosting) => job.applications?.length ?? 0;

  const loadJobs = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoadingJobs(true);
        await fetchCompanyJobs();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to retrieve job postings.');
      } finally {
        setLoadingJobs(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const toggleStatus = async (job: JobPosting) => {
    const next = job.status === 'open' ? 'closed' : 'open';
    const { error } = await supabase.from('job_postings').update({ status: next }).eq('id', job.id);
    if (error) {
      Alert.alert('Error', 'Failed to update status: ' + error.message);
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
  };

  return (
    <View style={styles.container}>
      <WebOnlyDecorations />
      <TopNavbar title="My Jobs" subtitle="Manage postings" />
      {loadingJobs ? (
        <View style={styles.listContainer}>
          <Skeleton height={110} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={12} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={12} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} tintColor={Theme.colors.primaryAccent} colors={[Theme.colors.primaryAccent]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: Math.min(index * 60, 300) }}>
              <AnimatedPressable onPress={() => router.push({ pathname: '/(company)/applicants/[jobId]' as any, params: { jobId: item.id } })} scaleTo={0.98}>
                <Card style={styles.card} elevation={1}>
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.headerRow}>
                      <Text style={styles.jobTitle}>{item.title}</Text>
                      <View style={[styles.statusPill, { backgroundColor: item.status === 'open' ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[styles.statusPillText, { color: item.status === 'open' ? Theme.colors.success : Theme.colors.error }]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.applicantCount}>Applicants: <Text style={styles.boldText}>{fetchApplicantCountPerJob(item)}</Text></Text>
                      <Text style={styles.dateText}>Posted: {new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{item.status === 'open' ? 'Open' : 'Closed'}</Text>
                      <Switch value={item.status === 'open'} onValueChange={() => toggleStatus(item)} color={Theme.colors.primaryAccent} />
                    </View>
                  </Card.Content>
                </Card>
              </AnimatedPressable>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No job postings created yet.</Text>
              <Button mode="contained" onPress={() => router.push('/(company)/post-job' as any)} style={styles.postButton} buttonColor={Theme.colors.primaryAccent} textColor="#FFFFFF">
                Create Your First Job Posting
              </Button>
            </View>
          }
        />
      )}
      <FAB icon="plus" style={styles.fab} color="#FFFFFF" onPress={() => router.push('/(company)/post-job' as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  listContainer: { padding: Theme.spacing.md, gap: Theme.spacing.sm, paddingBottom: 90 },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: Theme.spacing.sm },
  cardContent: { padding: Theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  jobTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText, flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.borderRadius.pill },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  applicantCount: { fontSize: 13, color: Theme.colors.secondaryText },
  boldText: { fontWeight: '700', color: Theme.colors.primaryText },
  dateText: { fontSize: 12, color: Theme.colors.secondaryText },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Theme.colors.borderLight },
  toggleLabel: { fontSize: 13, color: Theme.colors.secondaryText, fontWeight: '600' },
  emptyContainer: { padding: Theme.spacing.xl, alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: Theme.colors.secondaryText, marginBottom: Theme.spacing.md },
  postButton: { borderRadius: Theme.borderRadius.md },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: Theme.colors.primaryAccent, borderRadius: 16 },
});
