import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Divider, Searchbar } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { formatCTC } from '@/lib/format';

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

  const formatDeadline = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching all job postings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="All Jobs" subtitle="Moderate postings" />
      <View style={styles.searchWrap}>
        <Searchbar placeholder="Search title or company" value={query} onChangeText={setQuery} style={styles.search} inputStyle={{ fontSize: 14 }} />
      </View>
      <FlatList
        data={searchFilter(jobs)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.headerRow}>
                <View style={styles.titleInfo}>
                  <Text style={styles.jobTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.companyName}>
                    {item.companies?.company_name || 'Unknown Company'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: item.status === 'open' ? '#D1FAE5' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: item.status === 'open' ? Theme.colors.success : Theme.colors.error,
                      },
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailsGrid}>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CTC: </Text>
                  <Text style={styles.boldText}>{formatCTC(item.ctc)}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Applicants: </Text>
                  <Text style={styles.boldText}>{(item as any).applications?.length ?? 0}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Min CGPA: </Text>
                  <Text style={styles.boldText}>{item.min_cgpa}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Deadline: </Text>
                  <Text style={styles.boldText}>{formatDeadline(item.deadline)}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branches: </Text>
                  <Text style={styles.boldText}>
                    {item.eligible_branches ? item.eligible_branches.join(', ') : 'All'}
                  </Text>
                </Text>
              </View>

              {item.status === 'open' && (
                <Button
                  mode="outlined"
                  onPress={() => handleClosePosting(item.id)}
                  style={styles.closeBtn}
                  textColor={Theme.colors.error}
                  icon="close-box"
                >
                  Close Posting
                </Button>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No job postings exist in the database.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.body,
  },
  listContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  searchWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  search: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    elevation: 0,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardContent: {
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
  },
  titleInfo: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    fontSize: Theme.typography.sizes.cardTitle,
    fontWeight: Theme.typography.weights.bold as any,
    color: Theme.colors.textPrimary,
  },
  companyName: {
    fontSize: Theme.typography.sizes.body,
    color: Theme.colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  statusPillText: {
    fontSize: Theme.typography.sizes.caption,
    fontWeight: Theme.typography.weights.semibold as any,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: Theme.colors.border,
  },
  detailsGrid: {
    gap: 4,
  },
  detailRow: {
    fontSize: Theme.typography.sizes.body,
    color: Theme.colors.textSecondary,
  },
  detailLabel: {
    color: Theme.colors.textSecondary,
  },
  boldText: {
    fontWeight: Theme.typography.weights.semibold as any,
    color: Theme.colors.textPrimary,
  },
  closeBtn: {
    marginTop: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.button,
    borderColor: Theme.colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.body,
  },
});
