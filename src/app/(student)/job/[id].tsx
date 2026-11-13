import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Linking, TouchableOpacity } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { Skeleton } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, StatusChip, EmptyState } from '@/components/ui/kit';
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
  status: string;
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

/** Mirrors the announcement sheet: header block, then labelled sections, then the two action buttons. */
function JobDetailSkeleton() {
  return (
    <Card style={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 18 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Skeleton width={90} height={11} />
        <Skeleton width="55%" height={24} />
        <Skeleton width="40%" height={14} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <Skeleton width={84} height={24} borderRadius={999} />
          <Skeleton width={110} height={24} borderRadius={999} />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton width={150} height={12} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="85%" height={14} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton height={48} borderRadius={10} style={{ flex: 1 }} />
        <Skeleton height={48} borderRadius={10} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { dismissedIds, savedIds, loadPrefs, setSaved, setHidden } = useFeedStore();
  const jobIdStr = String(id ?? '');
  const dismissed = dismissedIds.includes(jobIdStr);
  const saved = savedIds.includes(jobIdStr);

  const { loading, error: loadError, begin, succeed, fail, end } = useLoadState('this drive');
  useScreenReady(!loading);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false); // blocks a fast double tap from registering twice
  const prefBusyRef = useRef(false);

  const fetchJobById = async () => {
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .select(
        'id, title, description, ctc, min_cgpa, eligible_branches, backlog_allowed, deadline, status, job_profiles, stipend, bond_years, location, round_names, round_dates, companies (company_name, description, website)'
      )
      .eq('id', id)
      .maybeSingle();
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

  const loadJob = useCallback(async () => {
    if (!id || !user) return;
    begin();
    try {
      const [details] = await Promise.all([fetchJobById(), loadPrefs(user.id)]);
      setJob(details ?? null);
      if (details) {
        setHasApplied(await checkIfAlreadyApplied(details.id));
      }
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  }, [id, user, begin, succeed, fail, end]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  // Coming back from Applications (where a registration may have been withdrawn): re-check quietly, no skeleton.
  useFocusEffect(
    useCallback(() => {
      if (!user || !job) return;
      checkIfAlreadyApplied(job.id)
        .then(setHasApplied)
        .catch(() => {});
    }, [user, job?.id])
  );

  const handleApply = async () => {
    if (!user || !job || applyingRef.current) return;
    if (job.status !== 'open') {
      showAlert('Drive closed', 'This drive is no longer accepting registrations.');
      return;
    }
    if (isDeadlinePassed(job.deadline)) {
      showAlert('Deadline passed', 'The registration deadline for this drive has passed.');
      return;
    }
    applyingRef.current = true;
    setApplying(true);
    try {
      if (await checkIfAlreadyApplied(job.id)) {
        setHasApplied(true);
        showAlert('Already Registered', 'You have already registered for this drive.');
        return;
      }
      const { error } = await supabase
        .from('applications')
        .insert({ student_id: user.id, job_id: job.id, status: 'applied' });
      if (error) {
        // 23505 = unique violation: the registration already exists.
        if ((error as any).code === '23505') {
          setHasApplied(true);
          showAlert('Already Registered', 'You have already registered for this drive.');
          return;
        }
        showAlert('Registration Failed', error.message);
        return;
      }
      setHasApplied(true);
      showAlert('Registered', 'You are registered for this campus drive!');
    } catch (e: any) {
      showAlert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  };

  const handleNotInterested = async () => {
    if (!job || !user || prefBusyRef.current) return;
    prefBusyRef.current = true;
    try {
      if (dismissed) {
        await setHidden(user.id, job.id, false);
        return;
      }
      if (await setHidden(user.id, job.id, true)) {
        showAlert('Hidden', 'This drive is hidden from your feed on all your devices.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } finally {
      prefBusyRef.current = false;
    }
  };

  const handleToggleSave = async () => {
    if (!job || !user || prefBusyRef.current) return;
    prefBusyRef.current = true;
    try {
      await setSaved(user.id, job.id, !saved);
    } finally {
      prefBusyRef.current = false;
    }
  };

  const checkDeadlinePassed = () => isDeadlinePassed(job?.deadline);

  if (loading || loadError) {
    return (
      <View style={styles.page}>
        <TopNavbar title="Announcement" subtitle="Loading…" showBack />
        <Screen>
          {loading ? <JobDetailSkeleton /> : <LoadError message={loadError} onRetry={loadJob} />}
        </Screen>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState icon="alert-circle-outline" title="Drive not found" hint="This job posting no longer exists." />
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
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <Card style={styles.sheet}>
            {/* 1. HEADER */}
            <View style={styles.headerBlock}>
              <Text style={styles.eyebrow}>Campus Placement Drive</Text>
              <Text style={styles.driveTitle}>{companyName.toUpperCase()}</Text>
              <Text style={styles.driveSubtitle}>Invitation for eligible students</Text>
              <View style={styles.headerChips}>
                <StatusChip label={ctcLabel} tone="success" />
                <StatusChip label={job.location || 'Location TBA'} tone="accent" />
              </View>
            </View>

            {/* 2. ABOUT COMPANY */}
            <Section title={`ABOUT ${companyName.toUpperCase()}`}>
              <Text style={styles.body}>{job.description || 'No description provided.'}</Text>
              {job.companies?.website ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => Linking.openURL(job.companies!.website!)}>
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

            {/* 5. DRIVE DETAILS — pipeline stepper */}
            <Section title="DRIVE DETAILS">
              {rounds.length === 0 ? (
                <Text style={styles.body}>Schedule to be announced.</Text>
              ) : (
                <View style={styles.pipeline}>
                  {rounds.map((r, i) => (
                    <View key={i} style={styles.step}>
                      <View style={styles.stepRail}>
                        <View style={[styles.dot, i === 0 && styles.dotFirst]} />
                        {i < rounds.length - 1 ? <View style={styles.line} /> : null}
                      </View>
                      <View style={styles.stepText}>
                        <Text style={styles.stepTitle}>Round {i + 1} — {r}</Text>
                        <Text style={styles.stepDate}>{formatRoundDate(dates[i])}</Text>
                      </View>
                    </View>
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
                <Button mode="contained" disabled style={styles.actionBtn} contentStyle={styles.actionContent} buttonColor={C.accent} textColor="#FFFFFF" icon="check-circle">
                  Already Registered
                </Button>
              ) : checkDeadlinePassed() ? (
                <Button mode="contained" disabled style={styles.actionBtn} contentStyle={styles.actionContent} buttonColor={C.accent} textColor="#FFFFFF" icon="clock-alert-outline">
                  Deadline Passed
                </Button>
              ) : (
                <Button mode="contained" onPress={handleApply} loading={applying} disabled={applying || dismissed} style={styles.actionBtn} contentStyle={styles.actionContent} buttonColor={C.accent} textColor="#FFFFFF" icon="send">
                  Register
                </Button>
              )}
              <Button mode="outlined" onPress={handleToggleSave} icon={saved ? 'bookmark' : 'bookmark-outline'} style={[styles.actionBtn, styles.ghostBtn]} contentStyle={styles.actionContent} textColor={saved ? C.accent : C.muted}>
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button mode="outlined" onPress={handleNotInterested} style={[styles.actionBtn, styles.ghostBtn]} contentStyle={styles.actionContent} textColor={C.muted}>
                {dismissed ? 'Hidden · Undo' : 'Not Interested'}
              </Button>
            </View>
          </Card>
        </MotiView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  sheet: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.paper },
  loadingText: { marginTop: 12, fontSize: 12, color: C.muted },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.paper, padding: 24 },
  headerBlock: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.line, gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted },
  driveTitle: { fontSize: 22, fontWeight: '700', color: C.ink, textAlign: 'center', letterSpacing: -0.8 },
  driveSubtitle: { fontSize: 13, color: C.muted, textAlign: 'center' },
  headerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0.8, marginBottom: 8 },
  sectionBody: { gap: 6 },
  body: { fontSize: 15, color: C.ink, lineHeight: 23 },
  bulletList: { gap: 6 },
  link: { fontSize: 14, fontWeight: '600', color: C.accent, marginTop: 6, minHeight: 44, textAlignVertical: 'center' },
  pipeline: { gap: 0 },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.card, borderWidth: 2, borderColor: C.accent, marginTop: 3 },
  dotFirst: { backgroundColor: C.accent, borderColor: C.accent },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: C.line, marginVertical: 2 },
  stepText: { flex: 1, minWidth: 0, flexShrink: 1, paddingBottom: 14 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  stepDate: { fontSize: 13, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 20 },
  actionBtn: { flex: 1, minWidth: 160, borderRadius: 10 },
  actionContent: { minHeight: 48 },
  ghostBtn: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF' },
});
