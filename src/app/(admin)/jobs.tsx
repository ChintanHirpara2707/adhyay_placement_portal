import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text, Searchbar } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip, EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';
import { formatCTC, formatDeadline } from '@/lib/format';

interface JobPosting {
  id: string;
  title: string;
  status: string;
  ctc: number;
  min_cgpa: number;
  eligible_branches: string[];
  backlog_allowed: boolean;
  deadline: string;
  companies: {
    company_name: string;
  } | null;
}

export default function JobsScreen() {
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('job postings');
  useScreenReady(!loading);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [query, setQuery] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchAllJobs = async (isRefresh = false) => {
    begin(isRefresh);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select(`
          id,
          title,
          status,
          ctc,
          min_cgpa,
          eligible_branches,
          backlog_allowed,
          deadline,
          companies (
            company_name
          ),
          applications ( id )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data as any[] || []);
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  };

  useEffect(() => {
    fetchAllJobs();
  }, []);

  const searchFilter = (list: JobPosting[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (j) => j.title.toLowerCase().includes(q) || ((j.companies as any)?.company_name ?? '').toLowerCase().includes(q)
    );
  };

  const confirmClose = (jobId: string, title: string) =>
    showAlert('Close this posting?', `"${title}" will stop accepting registrations.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close posting', style: 'destructive', onPress: () => handleClosePosting(jobId) },
    ]);

  const handleClosePosting = async (jobId: string) => {
    if (closingId) return; // one close at a time (ignores repeat taps)
    setClosingId(jobId);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .update({ status: 'closed' })
        .eq('id', jobId)
        .select('id');

      if (error || !data || data.length === 0) {
        showAlert('Error', 'Failed to close posting: ' + (error?.message ?? NO_ROWS_MESSAGE));
        return;
      }

      // Update local state
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: 'closed' } : job))
      );
      showAlert('Success', 'Job posting has been closed.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Something went wrong.');
    } finally {
      setClosingId(null);
    }
  };

  const filtered = searchFilter(jobs);

  return (
    <View style={styles.container}>
      <TopNavbar title="All Jobs" subtitle="Moderate postings" />
      <PageHeader title="All postings" subtitle={`${filtered.length} ${filtered.length === 1 ? 'posting' : 'postings'}`} maxWidth={1000} />
      <View style={styles.searchWrap}>
        <Searchbar placeholder="Search title or company" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} iconColor={C.muted} placeholderTextColor={C.muted} accessibilityLabel="Search postings" />
      </View>
      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="job" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => fetchAllJobs()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAllJobs(true)} tintColor={C.accent} />}>
        <DataTable
          columns={[
            {
              key: 'job',
              title: 'Job',
              flex: 2,
              render: (item) => (
                <View>
                  <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.companyName} numberOfLines={1}>{item.companies?.company_name || 'Unknown Company'}</Text>
                </View>
              ),
            },
            {
              key: 'status',
              title: 'Status',
              flex: 1,
              render: (item) => (
                <StatusChip label={item.status === 'open' ? 'Open' : 'Closed'} tone={item.status === 'open' ? 'success' : 'muted'} />
              ),
            },
            {
              key: 'meta',
              title: 'Details',
              flex: 2,
              render: (item) => (
                <Text style={styles.metaText} numberOfLines={3}>
                  {formatCTC(item.ctc)} · {(item as any).applications?.length ?? 0} applicants · CGPA {item.min_cgpa} · {formatDeadline(item.deadline)}
                </Text>
              ),
            },
            {
              key: 'action',
              title: '',
              flex: 1,
              render: (item) =>
                item.status === 'open' ? (
                  <Button mode="outlined" compact loading={closingId === item.id} onPress={() => confirmClose(item.id, item.title)} style={styles.closeBtn} textColor={C.danger} icon="close-box">
                    Close
                  </Button>
                ) : (
                  <Text style={styles.metaText}>—</Text>
                ),
            },
          ]}
          rows={filtered}
          keyOf={(item) => item.id}
        />
        {filtered.length === 0 ? (
          <EmptyState icon="briefcase-search-outline" title="No postings found" hint="No job postings exist in the database." />
        ) : null}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.paper,
  },
  loadingText: {
    marginTop: 12,
    color: C.muted,
    fontSize: 14,
  },
  listContainer: {
    ...pageColumn(1000),
    paddingBottom: 24,
    paddingTop: 4,
    gap: 12,
  },
  searchWrap: {
    ...pageColumn(1000),
    paddingTop: 8,
  },
  search: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    elevation: 0,
    minHeight: 48,
  },
  searchInput: { fontSize: 16 },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  companyName: {
    fontSize: 13,
    color: C.muted,
  },
  metaText: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
  },
  closeBtn: {
    borderRadius: 10,
    borderColor: C.line,
    alignSelf: 'flex-start',
  },
});
