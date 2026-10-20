import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Searchbar } from 'react-native-paper';
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
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [query, setQuery] = useState('');

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
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

      if (error) {
        Alert.alert('Error', 'Failed to retrieve jobs: ' + error.message);
        return;
      }

      setJobs(data as any[] || []);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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

  const handleClosePosting = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('job_postings')
        .update({ status: 'closed' })
        .eq('id', jobId);

      if (error) {
        Alert.alert('Error', 'Failed to close posting: ' + error.message);
        return;
      }

      // Update local state
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: 'closed' } : job))
      );
      Alert.alert('Success', 'Job posting has been closed.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Fetching all job postings...</Text>
      </View>
    );
  }

  const filtered = searchFilter(jobs);

  return (
    <View style={styles.container}>
      <TopNavbar title="All Jobs" subtitle="Moderate postings" />
      <PageHeader title="All postings" subtitle={`${filtered.length} ${filtered.length === 1 ? 'posting' : 'postings'}`} maxWidth={1000} />
      <View style={styles.searchWrap}>
        <Searchbar placeholder="Search title or company" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} iconColor={C.muted} placeholderTextColor={C.muted} accessibilityLabel="Search postings" />
      </View>
      <ScrollView contentContainerStyle={styles.listContainer}>
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
                  <Button mode="outlined" compact onPress={() => handleClosePosting(item.id)} style={styles.closeBtn} textColor={C.danger} icon="close-box">
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
