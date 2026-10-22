import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { StatusChip, statusToneFor, EmptyState, PageHeader, FilterChips, pageColumn } from '@/components/ui/kit';
import { formatCTC } from '@/lib/format';

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  selected: 'Selected',
  rejected: 'Rejected',
  round_cleared: 'Round Cleared',
};

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
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('applications');
  useScreenReady(!loading);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'selected' | 'rejected' | 'round_cleared'>('all');

  const fetchStudentApplications = async (isRefresh = false) => {
    if (!user) return;
    begin(isRefresh);

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

      if (error) throw error;

      setApplications(data as any[] || []);
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
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
      <TopNavbar title="Applications" subtitle="Track your status" />

      <PageHeader title="Applications" subtitle="Track every drive you have applied to." />

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={(['all', 'active', 'round_cleared', 'selected', 'rejected'] as const).map((f) => ({
          value: f,
          label: f[0].toUpperCase() + f.slice(1).replace('_', ' '),
        }))}
      />

      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={2} variant="application" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => fetchStudentApplications()} />
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
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.jobTitle} numberOfLines={2}>
                  {item.job_postings?.title || 'Unknown Position'}
                </Text>
                <StatusChip label={STATUS_LABELS[item.status] ?? item.status} tone={statusToneFor(item.status)} />
              </View>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.job_postings?.companies?.company_name || 'Unknown Company'}
              </Text>
              {item.status === 'round_cleared' ? (
                <Text style={styles.roundClearedNote}>
                  Round Cleared — Next Round Coming Soon
                </Text>
              ) : null}
              <View style={styles.infoRow}>
                <StatusChip label={formatCTC(item.job_postings?.ctc)} tone="accent" />
                <Text style={styles.dateText}>
                  Applied {formatAppliedAt(item.applied_at)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-search-outline"
              title={filter === 'all' ? 'No applications yet' : `No ${filter.replace('_', ' ')} applications`}
              hint="Apply to a drive from the Jobs tab to start your pipeline."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  listContainer: {
    ...pageColumn(720),
    paddingBottom: 24,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  companyName: {
    fontSize: 14,
    color: C.muted,
  },
  roundClearedNote: {
    fontSize: 12,
    fontWeight: '600',
    color: C.teal,
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: C.muted,
  },
});
