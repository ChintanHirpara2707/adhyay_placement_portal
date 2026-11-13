import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { LoadError } from '@/components/loading/LoadError';
import { Text, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { SimpleBarChart, BarDatum } from '@/components/ui/SimpleBarChart';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, EmptyState } from '@/components/ui/kit';
import { StatSummary } from '@/components/StatSummary';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { Skeleton } from '@/components/SkeletonLoader';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('the dashboard');
  useScreenReady(!loading);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [placementPct, setPlacementPct] = useState(0);
  const [avgCtc, setAvgCtc] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [unplacedCount, setUnplacedCount] = useState(0);
  const [openQueries, setOpenQueries] = useState(0);
  const [branchData, setBranchData] = useState<BarDatum[]>([]);
  const [recent, setRecent] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const fetchAdminStats = useCallback(async () => {
    const { count: sCount, error: qErr1 } = await supabase.from('students').select('id', { count: 'exact', head: true });
    if (qErr1) throw qErr1;
    const { count: cCount, error: qErr2 } = await supabase.from('companies').select('id', { count: 'exact', head: true });
    if (qErr2) throw qErr2;
    setTotalStudents(sCount ?? 0);
    setTotalCompanies(cCount ?? 0);
    const { count: pCount, error: qErr3 } = await supabase.from('companies').select('id', { count: 'exact', head: true }).eq('approved', false).is('rejection_reason', null);
    if (qErr3) throw qErr3;
    setPendingCount(pCount ?? 0);
    // Open support queries. A failure here must not blank the whole dashboard, so it only logs.
    const { count: qCount, error: qErr7 } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open');
    if (qErr7) console.warn('[admin] open queries count failed:', qErr7.message);
    setOpenQueries(qCount ?? 0);
  }, []);

  const calculatePlacementPercentage = useCallback(async () => {
    const { data: placedApps, error: qErr4 } = await supabase
      .from('applications')
      .select('student_id, job_postings(ctc), students(branch)')
      .eq('status', 'selected');
    if (qErr4) throw qErr4;
    const list = (placedApps as any[]) ?? [];
    const unique = new Set(list.map((a) => a.student_id));
    const { count: sCount, error: qErr5 } = await supabase.from('students').select('id', { count: 'exact', head: true });
    if (qErr5) throw qErr5;
    const total = sCount ?? 0;
    setPlacementPct(total > 0 ? (unique.size / total) * 100 : 0);
    setUnplacedCount(Math.max(total - unique.size, 0));
    const ctcs = list.map((a) => Number(a.job_postings?.ctc)).filter((n) => !Number.isNaN(n) && n > 0);
    const norm = ctcs.map((n) => (n > 1000 ? n / 100000 : n));
    setAvgCtc(norm.length > 0 ? norm.reduce((s, v) => s + v, 0) / norm.length : 0);
    const counts: Record<string, number> = {};
    list.forEach((a) => {
      const b = String(a.students?.branch ?? 'Unknown').trim() || 'Unknown';
      counts[b] = (counts[b] ?? 0) + 1;
    });
    setBranchData(
      Object.keys(counts)
        .map((label) => ({ label, value: counts[label] }))
        .sort((a, b) => b.value - a.value)
    );
  }, []);

  const fetchBranchWiseChart = useCallback(async () => {
    await calculatePlacementPercentage();
  }, [calculatePlacementPercentage]);

  const fetchPendingApprovalsCount = useCallback(async () => {
    const { data, error: qErr6 } = await supabase
      .from('companies')
      // `companies` has no created_at column: select only what exists and use "now" for the feed timestamp.
      .select('id, company_name')
      .eq('approved', false)
      .is('rejection_reason', null)
      .limit(5);
    if (qErr6) throw qErr6;
    setRecent(
      ((data as any[]) ?? []).map((c) => ({
        id: c.id,
        message: `${c.company_name ?? 'A company'} requested approval`,
        created_at: new Date().toISOString(),
      }))
    );
  }, []);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      begin(isRefresh);
      try {
        await Promise.all([fetchAdminStats(), fetchBranchWiseChart(), fetchPendingApprovalsCount()]);
        succeed();
      } catch (e: any) {
        fail(e);
      } finally {
        end();
      }
    },
    [fetchAdminStats, fetchBranchWiseChart, fetchPendingApprovalsCount, begin, succeed, fail, end]
  );

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // Live: registrations, approvals, placements and new support queries update the numbers by themselves.
  useRealtimeRefresh(
    [{ table: 'companies' }, { table: 'students' }, { table: 'applications' }, { table: 'support_tickets' }],
    () => loadAll()
  );

  return (
    <View style={styles.shell}>
      <TopNavbar title="Dashboard" subtitle="Admin analytics" />
      {loading ? (
        <Screen>
          <Skeleton height={132} borderRadius={14} />
          <Skeleton height={46} borderRadius={10} />
          <Skeleton height={240} borderRadius={14} />
        </Screen>
      ) : loadError ? (
        <Screen>
          <LoadError message={loadError} onRetry={() => loadAll()} />
        </Screen>
      ) : (
        <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={C.accent} />}>
          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
            <Text style={styles.heading}>Overview</Text>
          </MotiView>

          <StatSummary
            items={[
              { label: 'Students', value: totalStudents },
              { label: 'Companies', value: totalCompanies },
              { label: 'Placement', value: `${placementPct.toFixed(1)}%` },
              { label: 'Avg CTC', value: `${avgCtc.toFixed(1)} LPA` },
            ]}
          />

          <View style={styles.actionRow}>
            <Button
              mode="contained"
              icon="check-decagram-outline"
              buttonColor={C.accent}
              textColor="#FFFFFF"
              style={styles.actionBtn}
              contentStyle={styles.actionContent}
              onPress={() => nav.push('/(admin)/approvals' as any)}
            >
              {pendingCount > 0 ? `Review approvals (${pendingCount})` : 'Review approvals'}
            </Button>
            <Button
              mode="outlined"
              icon="bullhorn-outline"
              textColor={C.accent}
              style={[styles.actionBtn, styles.actionOutline]}
              contentStyle={styles.actionContent}
              onPress={() => nav.push('/(admin)/broadcast' as any)}
            >
              Send broadcast
            </Button>
            <Button
              mode="outlined"
              icon="domain"
              textColor={C.accent}
              style={[styles.actionBtn, styles.actionOutline]}
              contentStyle={styles.actionContent}
              onPress={() => nav.push('/(admin)/companies' as any)}
            >
              Companies
            </Button>
            <Button
              mode="outlined"
              icon="account-clock-outline"
              textColor={C.accent}
              style={[styles.actionBtn, styles.actionOutline]}
              contentStyle={styles.actionContent}
              onPress={() => nav.push({ pathname: '/(admin)/students', params: { placed: 'unplaced', t: String(Date.now()) } } as any)}
            >
              {`Unplaced students (${unplacedCount})`}
            </Button>
            <Button
              mode="outlined"
              icon="message-text-outline"
              textColor={C.accent}
              style={[styles.actionBtn, styles.actionOutline]}
              contentStyle={styles.actionContent}
              onPress={() => nav.push('/(admin)/queries' as any)}
            >
              {openQueries > 0 ? `Support queries (${openQueries})` : 'Support queries'}
            </Button>
          </View>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 180 }}>
            <Card>
              <SectionHeader title="Branch-wise placements" />
              <SimpleBarChart data={branchData} />
            </Card>
          </MotiView>

          <SectionHeader
            title="Recent activity"
            action={
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => nav.push('/(admin)/broadcast' as any)}
                accessibilityRole="button"
                accessibilityLabel="Send a broadcast"
              >
                <Text style={styles.link}>Broadcast</Text>
              </TouchableOpacity>
            }
          />
          <Card>
            {recent.length === 0 ? (
              <EmptyState icon="check-decagram-outline" title="All caught up" hint="No pending requests." />
            ) : (
              recent.map((r) => <ActivityFeedItem key={r.id} icon="domain-plus" message={r.message} timestamp={r.created_at} />)
            )}
          </Card>
        </Screen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.paper },
  heading: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flexGrow: 1, flexBasis: 160, borderRadius: 10 },
  actionOutline: { borderColor: C.line },
  actionContent: { minHeight: 46 },
  linkBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: C.accent, fontWeight: '600', fontSize: 14 },
});
