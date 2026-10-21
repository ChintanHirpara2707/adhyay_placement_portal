import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Text, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
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
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [placementPct, setPlacementPct] = useState(0);
  const [avgCtc, setAvgCtc] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [branchLabels, setBranchLabels] = useState<string[]>(['No Data']);
  const [branchValues, setBranchValues] = useState<number[]>([0]);
  const [recent, setRecent] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const fetchAdminStats = useCallback(async () => {
    const { count: sCount, error: qErr1 } = await supabase.from('students').select('id', { count: 'exact', head: true });
    if (qErr1) throw qErr1;
    const { count: cCount, error: qErr2 } = await supabase.from('companies').select('id', { count: 'exact', head: true });
    if (qErr2) throw qErr2;
    setTotalStudents(sCount ?? 0);
    setTotalCompanies(cCount ?? 0);
    const { count: pCount, error: qErr3 } = await supabase.from('companies').select('id', { count: 'exact', head: true }).eq('approved', false);
    if (qErr3) throw qErr3;
    setPendingCount(pCount ?? 0);
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
    const ctcs = list.map((a) => Number(a.job_postings?.ctc)).filter((n) => !Number.isNaN(n) && n > 0);
    const norm = ctcs.map((n) => (n > 1000 ? n / 100000 : n));
    setAvgCtc(norm.length > 0 ? norm.reduce((s, v) => s + v, 0) / norm.length : 0);
    const counts: Record<string, number> = {};
    list.forEach((a) => {
      const b = String(a.students?.branch ?? 'Unknown').trim() || 'Unknown';
      counts[b] = (counts[b] ?? 0) + 1;
    });
    const labels = Object.keys(counts);
    setBranchLabels(labels.length > 0 ? labels : ['No Data']);
    setBranchValues(labels.length > 0 ? labels.map((l) => counts[l]) : [0]);
  }, []);

  const fetchBranchWiseChart = useCallback(async () => {
    await calculatePlacementPercentage();
  }, [calculatePlacementPercentage]);

  const fetchPendingApprovalsCount = useCallback(async () => {
    const { data, error: qErr6 } = await supabase
      .from('companies')
      .select('id, company_name, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .limit(5);
    if (qErr6) throw qErr6;
    setRecent(
      ((data as any[]) ?? []).map((c) => ({
        id: c.id,
        message: `${c.company_name ?? 'A company'} requested approval`,
        created_at: c.created_at ?? new Date().toISOString(),
      }))
    );
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAdminStats(), fetchBranchWiseChart(), fetchPendingApprovalsCount()]);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [fetchAdminStats, fetchBranchWiseChart, fetchPendingApprovalsCount]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.shell}>
      <TopNavbar title="Dashboard" subtitle="Admin analytics" />
      {loading ? (
        <Screen>
          <Skeleton height={132} borderRadius={14} />
          <Skeleton height={46} borderRadius={10} />
          <Skeleton height={240} borderRadius={14} />
        </Screen>
      ) : (
        <Screen>
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
              onPress={() => router.push('/(admin)/approvals' as any)}
            >
              {pendingCount > 0 ? `Review approvals (${pendingCount})` : 'Review approvals'}
            </Button>
            <Button
              mode="outlined"
              icon="bullhorn-outline"
              textColor={C.accent}
              style={[styles.actionBtn, styles.actionOutline]}
              contentStyle={styles.actionContent}
              onPress={() => router.push('/(admin)/broadcast' as any)}
            >
              Send broadcast
            </Button>
          </View>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 180 }}>
            <Card>
              <SectionHeader title="Branch-wise placements" />
              <BarChart
                data={{ labels: branchLabels, datasets: [{ data: branchValues }] }}
                width={Math.min(screenWidth - 64, 560)}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: C.card,
                  backgroundGradientFrom: C.card,
                  backgroundGradientTo: C.card,
                  decimalPlaces: 0,
                  color: (o = 1) => `rgba(37, 99, 235, ${o})`,
                  labelColor: (o = 1) => `rgba(107, 114, 128, ${o})`,
                  barPercentage: 0.6,
                }}
                style={styles.chart}
              />
            </Card>
          </MotiView>

          <SectionHeader
            title="Recent activity"
            action={
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => router.push('/(admin)/broadcast' as any)}
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
  chart: { borderRadius: 14, alignSelf: 'center', marginTop: 8 },
  linkBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: C.accent, fontWeight: '600', fontSize: 14 },
});
