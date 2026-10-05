import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, Linking } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import StatusPill from '@/components/StatusPill';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';

interface Applicant {
  id: string;
  status: string;
  applied_at: string;
  student_id: string;
  students: {
    full_name: string;
    cgpa: number;
    branch: string;
    resume_url: string | null;
  } | null;
  job_postings: {
    title: string;
  } | null;
}

export default function JobApplicantsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'applied' | 'shortlisted' | 'rejected'>('all');

  const fetchApplicantsForJob = async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          student_id,
          students (
            full_name,
            cgpa,
            branch,
            resume_url
          ),
          job_postings (
            title
          )
        `)
        .eq('job_id', jobId);

      if (error) {
        Alert.alert('Error', 'Failed to retrieve applicants.');
        router.back();
        return;
      }

      const list = data as any[] || [];
      setApplicants(list);

      if (list.length > 0 && list[0].job_postings) {
        setJobTitle(list[0].job_postings.title);
      } else {
        // Fallback fetch job details to get title if no applicants yet
        const { data: jobData, error: jobError } = await supabase
          .from('job_postings')
          .select('title')
          .eq('id', jobId)
          .single();
        if (jobError) {
          console.error('Failed to fetch job details in fallback:', jobError.message);
        }
        if (jobData) {
          setJobTitle(jobData.title);
        }
      }
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicantsForJob();
  }, [jobId]);

  const filterByStatus = (list: Applicant[]) => (filter === 'all' ? list : list.filter((a) => a.status === filter));
  const visible = filterByStatus(applicants);

  const handleUpdateStatus = async (applicant: Applicant, newStatus: 'shortlisted' | 'rejected') => {
    try {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicant.id);

      if (updateError) {
        Alert.alert('Error', 'Failed to update applicant status: ' + updateError.message);
        return;
      }

      // 2. Insert notification
      const message = newStatus === 'shortlisted'
        ? `Congratulations! You have been shortlisted for the job "${jobTitle}".`
        : `Thank you for applying. Unfortunately, your application for "${jobTitle}" was not selected.`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: applicant.student_id,
          message: message,
          read: false,
        });

      if (notifError) {
        console.warn('Failed to insert notification:', notifError.message);
      }

      // 3. Update state locally
      setApplicants((prev) =>
        prev.map((app) => (app.id === applicant.id ? { ...app, status: newStatus } : app))
      );

      Alert.alert('Success', `Applicant has been ${newStatus}.`);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching applicants list...</Text>
      </View>
    );
  }

  const handleShortlist = async (applicant: Applicant) => handleUpdateStatus(applicant, 'shortlisted');
  const handleReject = async (applicant: Applicant) => handleUpdateStatus(applicant, 'rejected');

  return (
    <View style={styles.container}>
      <TopNavbar title="Applicants" subtitle={jobTitle || 'Job applicants'} showBack />
      <View style={styles.chips}>
        {(['all', 'applied', 'shortlisted', 'rejected'] as const).map((f) => (
          <Text key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            {f[0].toUpperCase() + f.slice(1)}
          </Text>
        ))}
      </View>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Applicants for: <Text style={styles.boldText}>{jobTitle || 'Job Position'}</Text>
        </Text>
        <Text style={styles.countText}>
          Total Candidates: {visible.length}
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.applicantInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>
                    {item.students?.full_name || 'Incomplete Profile'}
                  </Text>
                  <StatusPill status={item.status} />
                </View>
                <Text style={styles.detailText}>
                  Branch: <Text style={styles.boldText}>{item.students?.branch || 'N/A'}</Text>
                </Text>
                <Text style={styles.detailText}>
                  CGPA: <Text style={styles.boldText}>{item.students?.cgpa || 'N/A'}</Text>
                </Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.actionsRow}>
                {item.students?.resume_url && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => Linking.openURL(item.students!.resume_url!)}
                    icon="file-pdf-box"
                    textColor={Theme.colors.primary}
                    style={styles.resumeBtn}
                  >
                    View Resume
                  </Button>
                )}

                {item.status === 'applied' && (
                  <View style={styles.decisionButtons}>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleShortlist(item)}
                      style={styles.shortlistBtn}
                      buttonColor={Theme.colors.primary}
                      textColor="#FFFFFF"
                    >
                      Shortlist
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => handleReject(item)}
                      style={styles.rejectBtn}
                      textColor={Theme.colors.error}
                    >
                      Reject
                    </Button>
                  </View>
                )}
                <Button
                  mode="text"
                  compact
                  onPress={() => router.push({ pathname: '/(company)/applicant/[id]' as any, params: { id: item.id } })}
                  textColor={Theme.colors.primaryAccent}
                >
                  View & Interview
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No applications received for this job yet.
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
  header: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerText: {
    fontSize: Theme.typography.sizes.sectionHeader,
    color: Theme.colors.textPrimary,
  },
  boldText: {
    fontWeight: Theme.typography.weights.bold as any,
    color: Theme.colors.textPrimary,
  },
  countText: {
    color: Theme.colors.textSecondary,
    marginTop: 4,
    fontSize: Theme.typography.sizes.caption,
  },
  listContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
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
  applicantInfo: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: Theme.typography.sizes.cardTitle,
    fontWeight: Theme.typography.weights.bold as any,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  detailText: {
    fontSize: Theme.typography.sizes.body,
    color: Theme.colors.textSecondary,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: Theme.colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    paddingTop: 4,
  },
  resumeBtn: {
    borderRadius: Theme.borderRadius.button,
    borderColor: Theme.colors.primary,
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  shortlistBtn: {
    borderRadius: Theme.borderRadius.button,
  },
  rejectBtn: {
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
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    flexWrap: 'wrap',
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
