import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { Button } from '@/components/ui/AppButton';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { JobCardSkeleton } from '@/components/SkeletonLoader';
import { StatusChip, statusToneFor, EmptyState, PageHeader, FilterChips, pageColumn } from '@/components/ui/kit';
import { formatCTC, formatDateTime, isDeadlinePassed } from '@/lib/format';

interface HistoryRow {
  id: string;
  status: string;
  changed_at: string;
}

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
  offer_response: 'pending' | 'accepted' | 'declined' | null;
  offer_reason: string | null;
  job_postings: {
    title: string;
    ctc: number;
    deadline: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryRow[] | 'error'>>({});
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const withdrawingRef = useRef(false);

  const loadHistory = async (applicationId: string) => {
    const { data, error } = await supabase
      .from('application_status_history')
      .select('id, status, changed_at')
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: true });
    setHistory((h) => ({ ...h, [applicationId]: error ? 'error' : ((data as any[]) ?? []) }));
  };

  const toggleExpand = (applicationId: string) => {
    if (expandedId === applicationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(applicationId);
    // Always refetch on open so a status change made since the last look is included.
    loadHistory(applicationId);
  };

  const canWithdraw = (a: Application) => a.status === 'applied' && !isDeadlinePassed(a.job_postings?.deadline);

  const withdraw = async (a: Application) => {
    if (withdrawingRef.current) return;
    withdrawingRef.current = true;
    setWithdrawingId(a.id);
    try {
      // select() proves the row was really deleted (RLS silently filters a disallowed delete to zero rows).
      const { data, error } = await supabase.from('applications').delete().eq('id', a.id).select('id');
      if (error) {
        showAlert('Could not withdraw', error.message);
        return;
      }
      if (!data || data.length === 0) {
        showAlert('Could not withdraw', 'This registration can no longer be withdrawn (the deadline passed or its status changed). ' + NO_ROWS_MESSAGE);
        fetchStudentApplications(true);
        return;
      }
      setApplications((prev) => prev.filter((x) => x.id !== a.id));
      if (expandedId === a.id) setExpandedId(null);
      showAlert('Withdrawn', 'Your registration was withdrawn. You can register again before the deadline.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Something went wrong.');
    } finally {
      withdrawingRef.current = false;
      setWithdrawingId(null);
    }
  };

  // Offer answer: pick a side, optionally type a reason, then confirm. It can be answered only once.
  const [offerDraft, setOfferDraft] = useState<{ id: string; choice: 'accepted' | 'declined'; reason: string } | null>(null);
  const [offerBusyId, setOfferBusyId] = useState<string | null>(null);
  const offerBusyRef = useRef(false);

  const submitOffer = async (a: Application, choice: 'accepted' | 'declined', reason: string) => {
    if (offerBusyRef.current) return;
    offerBusyRef.current = true;
    setOfferBusyId(a.id);
    try {
      const cleanReason = reason.trim().slice(0, 500) || null;
      // .eq('offer_response','pending') + select() make a second answer fail loudly instead of silently.
      const { data, error } = await supabase
        .from('applications')
        .update({ offer_response: choice, offer_reason: cleanReason })
        .eq('id', a.id)
        .eq('offer_response', 'pending')
        .select('id');
      if (error) {
        showAlert('Could not send your answer', error.message);
        return;
      }
      if (!data || data.length === 0) {
        showAlert('Already answered', 'This offer has already been answered, or it is no longer open. ' + NO_ROWS_MESSAGE);
        fetchStudentApplications(true);
        return;
      }
      setApplications((prev) => prev.map((x) => (x.id === a.id ? { ...x, offer_response: choice, offer_reason: cleanReason } : x)));
      setOfferDraft(null);
      showAlert(choice === 'accepted' ? 'Offer accepted' : 'Offer declined', 'The company has been notified of your decision.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'Something went wrong.');
    } finally {
      offerBusyRef.current = false;
      setOfferBusyId(null);
    }
  };

  const confirmOffer = (a: Application, choice: 'accepted' | 'declined', reason: string) =>
    showAlert(
      choice === 'accepted' ? 'Accept this offer?' : 'Decline this offer?',
      `${a.job_postings?.companies?.company_name || 'The company'} will be notified. You can answer only once and cannot change it afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: choice === 'accepted' ? 'Accept' : 'Decline', style: choice === 'declined' ? 'destructive' : 'default', onPress: () => submitOffer(a, choice, reason) },
      ]
    );

  const confirmWithdraw = (a: Application) =>
    showAlert('Withdraw registration?', `You will be removed from ${a.job_postings?.title || 'this drive'}. You can register again until the deadline.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw(a) },
    ]);

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
          offer_response,
          offer_reason,
          job_postings (
            title,
            ctc,
            deadline,
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
          renderItem={({ item }) => {
            const open = expandedId === item.id;
            const rows = history[item.id];
            return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => toggleExpand(item.id)} accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} timeline`}>
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
                <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} style={styles.chevron} />
              </View>

              {item.status === 'selected' ? (
                <View style={styles.offerCard}>
                  <Text style={styles.offerTitle}>
                    {item.offer_response === 'accepted'
                      ? 'You accepted this offer'
                      : item.offer_response === 'declined'
                        ? 'You declined this offer'
                        : 'You have an offer!'}
                  </Text>
                  {item.offer_response === 'accepted' || item.offer_response === 'declined' ? (
                    item.offer_reason ? <Text style={styles.offerReason}>Your note: {item.offer_reason}</Text> : null
                  ) : offerDraft?.id === item.id ? (
                    <View style={styles.offerForm}>
                      <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                        placeholder={offerDraft.choice === 'accepted' ? 'Optional note to the company' : 'Optional reason for declining'}
                        value={offerDraft.reason}
                        onChangeText={(t) => setOfferDraft((d) => (d ? { ...d, reason: t } : d))}
                        style={styles.offerInput}
                        outlineColor={C.line}
                        activeOutlineColor={C.accent}
                      />
                      <View style={styles.offerRow}>
                        <Button
                          mode="contained"
                          onPress={() => confirmOffer(item, offerDraft.choice, offerDraft.reason)}
                          loading={offerBusyId === item.id}
                          disabled={offerBusyId !== null}
                          buttonColor={offerDraft.choice === 'accepted' ? C.success : C.danger}
                          textColor="#FFFFFF"
                          style={styles.offerBtn}
                          contentStyle={styles.withdrawContent}
                        >
                          {offerDraft.choice === 'accepted' ? 'Confirm accept' : 'Confirm decline'}
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => setOfferDraft(null)}
                          disabled={offerBusyId !== null}
                          textColor={C.muted}
                          style={[styles.offerBtn, { borderColor: C.line }]}
                          contentStyle={styles.withdrawContent}
                        >
                          Back
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.offerRow}>
                      <Button
                        mode="contained"
                        onPress={() => setOfferDraft({ id: item.id, choice: 'accepted', reason: '' })}
                        buttonColor={C.success}
                        textColor="#FFFFFF"
                        style={styles.offerBtn}
                        contentStyle={styles.withdrawContent}
                      >
                        Accept
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => setOfferDraft({ id: item.id, choice: 'declined', reason: '' })}
                        textColor={C.danger}
                        style={[styles.offerBtn, { borderColor: C.line }]}
                        contentStyle={styles.withdrawContent}
                      >
                        Decline
                      </Button>
                    </View>
                  )}
                </View>
              ) : null}

              {open ? (
                <View style={styles.timeline}>
                  <Text style={styles.timelineTitle}>Timeline</Text>
                  {rows === undefined ? (
                    <Text style={styles.dateText}>Loading…</Text>
                  ) : rows === 'error' ? (
                    <Text style={styles.errorText}>Could not load the timeline. Close and reopen the card to retry.</Text>
                  ) : rows.length === 0 ? (
                    <Text style={styles.dateText}>No status changes recorded yet.</Text>
                  ) : (
                    rows.map((r, i) => (
                      <View key={r.id} style={styles.tlRow}>
                        <View style={styles.tlRail}>
                          <View style={[styles.tlDot, i === rows.length - 1 && styles.tlDotLast]} />
                          {i < rows.length - 1 ? <View style={styles.tlLine} /> : null}
                        </View>
                        <View style={styles.tlText}>
                          <Text style={styles.tlStatus}>{STATUS_LABELS[r.status] ?? r.status}</Text>
                          <Text style={styles.dateText}>{formatDateTime(r.changed_at)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {canWithdraw(item) ? (
                <Button
                  mode="outlined"
                  icon="undo-variant"
                  onPress={() => confirmWithdraw(item)}
                  loading={withdrawingId === item.id}
                  disabled={withdrawingId !== null}
                  textColor={C.danger}
                  style={styles.withdraw}
                  contentStyle={styles.withdrawContent}
                >
                  Withdraw registration
                </Button>
              ) : null}
            </View>
            </TouchableOpacity>
            );
          }}
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
  chevron: { marginLeft: 'auto' },
  errorText: { fontSize: 12, color: C.danger },
  timeline: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, gap: 2 },
  timelineTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted, marginBottom: 6 },
  tlRow: { flexDirection: 'row', gap: 10 },
  tlRail: { alignItems: 'center', width: 16 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.card, borderWidth: 2, borderColor: C.accent, marginTop: 4 },
  tlDotLast: { backgroundColor: C.accent },
  tlLine: { width: 2, flex: 1, minHeight: 14, backgroundColor: C.line, marginVertical: 2 },
  tlText: { flex: 1, minWidth: 0, paddingBottom: 10 },
  tlStatus: { fontSize: 14, fontWeight: '600', color: C.ink },
  offerCard: { marginTop: 8, backgroundColor: C.successSoft, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, gap: 8 },
  offerTitle: { fontSize: 14, fontWeight: '700', color: C.success },
  offerReason: { fontSize: 13, color: C.ink, lineHeight: 19 },
  offerForm: { gap: 8 },
  offerInput: { backgroundColor: C.card, fontSize: 15 },
  offerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  offerBtn: { flex: 1, minWidth: 130, borderRadius: 10 },
  withdraw: { marginTop: 8, borderRadius: 10, borderColor: C.line },
  withdrawContent: { minHeight: 44 },
});
