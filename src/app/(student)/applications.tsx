import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import StatusPill from '@/components/StatusPill';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';
import { formatCTC } from '@/lib/format';

interface Application {
  id: string;
  status: string;
  applied_at: string;
  job_postings: {
    title: string;
    ctc: number;
    companies: {
      company_name: string;
    } | null;
  } | null;
}

export default function ApplicationsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'selected' | 'rejected' | 'round_cleared'>('all');

  const fetchStudentApplications = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          job_postings (
            title,
            ctc,
            companies (
              company_name
            )
          )
        `)
        .eq('student_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to retrieve applications: ' + error.message);
        return;
      }

      setApplications(data as any[] || []);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStudentApplications();
    }, [user])
  );

  const filterByStatus = (list: Application[]) => {
    if (filter === 'all') return list;
    if (filter === 'active') return list.filter((a) => ['applied', 'shortlisted', 'interview_scheduled', 'round_cleared'].includes(a.status));
    return list.filter((a) => a.status === filter);
  };

  const sortByDate = (list: Application[]) => [...list].sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());

  const visible = sortByDate(filterByStatus(applications));

  const formatAppliedAt = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <WebOnlyDecorations />
      <TopNavbar title="Applications" subtitle="Track your status" />

      <View style={styles.chips}>
        {(['all', 'active', 'round_cleared', 'selected', 'rejected'] as const).map((f) => (
          <Text key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            {f[0].toUpperCase() + f.slice(1).replace('_', ' ')}
          </Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.listContainer}>
          <JobCardSkeleton />
          <JobCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStudentApplications(true)}
              tintColor={Theme.colors.primaryAccent}
              colors={[Theme.colors.primaryAccent]}
            />
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 15 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: 300,
                delay: Math.min(index * 60, 300),
              }}
            >
              <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.jobTitle}>
                      {item.job_postings?.title || 'Unknown Position'}
                    </Text>
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={styles.companyName}>
                    🏢 {item.job_postings?.companies?.company_name || 'Unknown Company'}
                  </Text>
                  {item.status === 'round_cleared' ? (
                    <Text style={styles.roundClearedNote}>
                      Round Cleared — Next Round Coming Soon
                    </Text>
                  ) : null}
                  <View style={styles.infoRow}>
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagText}>
                        {formatCTC(item.job_postings?.ctc)}
                      </Text>
                    </View>
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagText}>
                        Applied: {formatAppliedAt(item.applied_at)}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'You have not submitted any applications yet.' : `No ${filter} applications.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  listContainer: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.sm,
  },
  cardContent: {
    padding: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.primaryText,
    flex: 1,
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.secondaryText,
    marginBottom: Theme.spacing.sm,
  },
  roundClearedNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  infoTag: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  infoTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Theme.colors.secondaryText,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  chipActive: {
    backgroundColor: Theme.colors.primaryAccent,
    borderColor: Theme.colors.primaryAccent,
    color: '#fff',
  },
});
