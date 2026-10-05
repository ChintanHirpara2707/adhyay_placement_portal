import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { Card, Text, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { formatCTC, isDeadlinePassed } from '@/lib/format';

interface JobDetails {
  id: string;
  title: string;
  description: string;
  ctc: number;
  min_cgpa: number;
  eligible_branches: string[];
  backlog_allowed: boolean;
  deadline: string;
  job_profiles: string[];
  stipend: number | null;
  bond_years: number | null;
  location: string | null;
  round_names: string[];
  round_dates: string[];
  companies: {
    company_name: string;
    description: string | null;
    website: string | null;
  } | null;
}

const formatDeadlineLong = (dateString: string) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatRoundDate = (dateString: string | null | undefined) => {
  if (!dateString || !dateString.trim()) return 'Date to be announced';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'Date to be announced';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { dismissJob, isDismissed } = useFeedStore();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchJobById = async () => {
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .select(
        'id, title, description, ctc, min_cgpa, eligible_branches, backlog_allowed, deadline, job_profiles, stipend, bond_years, location, round_names, round_dates, companies (company_name, description, website)'
      )
      .eq('id', id)
      .single();
    if (jobError) throw jobError;
    return jobData as any;
  };

  const checkIfAlreadyApplied = async (jobId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', user!.id)
      .eq('job_id', jobId);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  };

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        setLoading(true);
        const details = await fetchJobById();
        setJob(details);
        setHasApplied(await checkIfAlreadyApplied(details.id));
        setDismissed(isDismissed(details.id));
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to retrieve job details.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !job) return;
    setApplying(true);
    try {
      if (await checkIfAlreadyApplied(job.id)) {
        setHasApplied(true);
        Alert.alert('Already Registered', 'You have already registered for this drive.');
        setApplying(false);
        return;
      }
      const { error } = await supabase
        .from('applications')
        .insert({ student_id: user.id, job_id: job.id, status: 'applied' });
      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }
      setHasApplied(true);
      Alert.alert('Registered', 'You are registered for this campus drive!');
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setApplying(false);
    }
  };

  const handleNotInterested = () => {
    if (!job) return;
    dismissJob(job.id);
    setDismissed(true);
    Alert.alert('Hidden', 'This drive is hidden from your feed on this device.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const checkDeadlinePassed = () => isDeadlinePassed(job?.deadline);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primaryAccent} />
        <Text style={styles.loadingText}>Loading announcement…</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text>Job posting not found.</Text>
      </View>
    );
  }

  const companyName = job.companies?.company_name || 'Unknown Company';
  const profiles = Array.isArray(job.job_profiles) && job.job_profiles.length > 0 ? job.job_profiles : [job.title];
  const rounds = Array.isArray(job.round_names) && job.round_names.length > 0 ? job.round_names : [];
  const dates: string[] = Array.isArray(job.round_dates) ? job.round_dates : [];
  const noCriteria = (!job.min_cgpa || job.min_cgpa === 0) && (!job.eligible_branches || job.eligible_branches.length === 0);
  const ctcLabel = formatCTC(job.ctc);

  return (
    <View style={styles.page}>
      <TopNavbar title="Announcement" subtitle={companyName} showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 320 }}>
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              {/* 1. HEADER */}
              <View style={styles.headerBlock}>
                <Text style={styles.driveTitle}>CAMPUS PLACEMENT DRIVE — {companyName.toUpperCase()}</Text>
                <Text style={styles.driveSubtitle}>Invitation for eligible students</Text>
              </View>

              {/* 2. ABOUT COMPANY */}
              <Section title={`ABOUT ${companyName.toUpperCase()}`}>
                <Text style={styles.body}>{job.description || 'No description provided.'}</Text>
                {job.companies?.website ? (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(job.companies!.website!)}>
                    <Text style={styles.link}>Visit Website →</Text>
                  </TouchableOpacity>
                ) : null}
              </Section>

              {/* 3. ELIGIBILITY CRITERIA */}
              <Section title="ELIGIBILITY CRITERIA">
                {noCriteria ? (
                  <Text style={styles.body}>No Criteria</Text>
                ) : (
                  <View style={styles.bulletList}>
                    <Text style={styles.body}>• Minimum CGPA: {job.min_cgpa || 'None'}</Text>
                    {job.eligible_branches && job.eligible_branches.length > 0 ? (
                      <Text style={styles.body}>• Eligible Branches: {job.eligible_branches.join(', ')}</Text>
                    ) : null}
                    <Text style={styles.body}>• Backlogs: {job.backlog_allowed ? 'Allowed' : 'Not Allowed'}</Text>
                  </View>
                )}
              </Section>

              {/* 4. JOB PROFILES OFFERED */}
              <Section title="JOB PROFILES OFFERED">
                <View style={styles.bulletList}>
                  {profiles.map((p, i) => (
                    <Text key={i} style={styles.body}>• {p}</Text>
                  ))}
                </View>
              </Section>

              {/* 5. DRIVE DETAILS */}
              <Section title="DRIVE DETAILS">
                {rounds.length === 0 ? (
                  <Text style={styles.body}>Schedule to be announced.</Text>
                ) : (
                  <View style={styles.bulletList}>
                    {rounds.map((r, i) => (
                      <Text key={i} style={styles.body}>
                        Round {i + 1} — {r}: {formatRoundDate(dates[i])}
                      </Text>
                    ))}
                  </View>
                )}
              </Section>

              {/* 6. REGISTRATION REQUIREMENTS */}
              <Section title="REGISTRATION REQUIREMENTS">
                <Text style={styles.body}>Registration Deadline: {formatDeadlineLong(job.deadline)}</Text>
              </Section>

              {/* 7. LOGISTICS & CONDUCT */}
              <Section title="LOGISTICS & CONDUCT">
                <View style={styles.bulletList}>
                  <Text style={styles.body}>
                    • Educational Qualification: {job.eligible_branches && job.eligible_branches.length > 0 ? job.eligible_branches.join(', ') : 'All branches'}
                  </Text>
                  {profiles.map((p, i) => (
                    <Text key={i} style={styles.body}>• {p} — {ctcLabel} CTC</Text>
                  ))}
                  <Text style={styles.body}>
                    • Internship Terms: {job.stipend ? `₹${job.stipend}/month, 6 months` : 'Not applicable'}
                  </Text>
                  <Text style={styles.body}>
                    • Service Agreement: {job.bond_years ? `${job.bond_years} Years` : 'None'}
                  </Text>
                  <Text style={styles.body}>• Job Location: {job.location || 'Not specified'}</Text>
                </View>
              </Section>

              {/* 8. REGISTRATION ACTION */}
              <View style={styles.actions}>
                {hasApplied ? (
                  <Button mode="contained" disabled style={[styles.actionBtn, { backgroundColor: Theme.colors.buttonDisabledBg }]} textColor={Theme.colors.buttonDisabledText} icon="check-circle">
                    Already Registered
                  </Button>
                ) : checkDeadlinePassed() ? (
                  <Button mode="contained" disabled style={[styles.actionBtn, { backgroundColor: Theme.colors.buttonDisabledBg }]} textColor={Theme.colors.buttonDisabledText} icon="clock-alert-outline">
                    Deadline Passed
                  </Button>
                ) : (
                  <Button mode="contained" onPress={handleApply} loading={applying} disabled={applying || dismissed} style={styles.actionBtn} buttonColor={Theme.colors.primaryAccent} textColor="#FFFFFF" icon="send">
                    Register
                  </Button>
                )}
                <Button mode="outlined" onPress={handleNotInterested} disabled={dismissed} style={styles.actionBtn} textColor={Theme.colors.secondaryText}>
                  {dismissed ? 'Hidden' : 'Not Interested'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: { padding: Theme.spacing.md, paddingBottom: 28 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  loadingText: { marginTop: 12, ...Theme.typography.caption },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  card: { backgroundColor: Theme.colors.cardBackground, borderRadius: Theme.borderRadius.card, borderWidth: 1, borderColor: Theme.colors.border },
  cardContent: { padding: Theme.spacing.lg, gap: 0 },
  headerBlock: { alignItems: 'center', paddingBottom: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  driveTitle: { fontSize: 17, fontWeight: '700', color: Theme.colors.primaryText, textAlign: 'center' },
  driveSubtitle: { fontSize: 13, color: Theme.colors.secondaryText, marginTop: 4, textAlign: 'center' },
  section: { paddingVertical: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: Theme.colors.primaryText, letterSpacing: 0.5, marginBottom: 8 },
  sectionBody: { gap: 6 },
  body: { fontSize: 14, color: Theme.colors.primaryText, lineHeight: 21 },
  bulletList: { gap: 6 },
  link: { fontSize: 14, fontWeight: '600', color: Theme.colors.primaryAccent, marginTop: 6 },
  actions: { flexDirection: 'row', gap: Theme.spacing.sm, paddingTop: Theme.spacing.lg },
  actionBtn: { flex: 1, borderRadius: Theme.borderRadius.button },
});
