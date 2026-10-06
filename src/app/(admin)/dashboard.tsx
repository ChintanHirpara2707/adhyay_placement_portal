import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, SectionHeader, StatCard, EmptyState, ResponsiveGrid } from '@/components/ui/kit';
import { ActivityFeedItem } from '@/components/ActivityFeedItem';
import { Skeleton } from '@/components/SkeletonLoader';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

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
    const { count: sCount } = await supabase.from('students').select('id', { count: 'exact', head: true });
    const { count: cCount } = await supabase.from('companies').select('id', { count: 'exact', head: true });
    setTotalStudents(sCount ?? 0);
    setTotalCompanies(cCount ?? 0);
    const { count: pCount } = await supabase.from('companies').select('id', { count: 'exact', head: true }).eq('approved', false);
    setPendingCount(pCount ?? 0);
  }, []);

  const calculatePlacementPercentage = useCallback(async () => {
    const { data: placedApps } = await supabase
      .from('applications')
      .select('student_id, job_postings(ctc), students(branch)')
      .eq('status', 'selected');
    const list = (placedApps as any[]) ?? [];
    const unique = new Set(list.map((a) => a.student_id));
    const { count: sCount } = await supabase.from('students').select('id', { count: 'exact', head: true });
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
    const { data } = await supabase
      .from('companies')
      .select('id, company_name, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: false })
      .limit(5);
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
      Alert.alert('Error', e.message || 'Failed to load dashboard.');
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
      <WebOnlyDecorations />
      <TopNavbar title="Dashboard" subtitle="Admin analytics" />
      {loading ? (
        <Screen>
          <ResponsiveGrid>
            <Skeleton height={130} borderRadius={24} />
            <Skeleton height={130} borderRadius={24} />
            <Skeleton height={130} borderRadius={24} />
            <Skeleton height={130} borderRadius={24} />
          </ResponsiveGrid>
          <Skeleton height={240} borderRadius={24} />
        </Screen>
      ) : (
        <Screen>
          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
            <Text style={styles.eyebrow}>Placement Cell</Text>
            <Text style={styles.heading}>Overview</Text>
          </MotiView>

          <ResponsiveGrid>
            <StatCard index="01" label="Students" value={totalStudents} icon="account-multiple" tone="accent" />
            <StatCard index="02" label="Companies" value={totalCompanies} icon="domain" tone="accent" />
            <StatCard index="03" label="Placement" value={`${placementPct.toFixed(1)}%`} icon="chart-bar" tone="success" />
            <StatCard index="04" label="Avg CTC" value={`${avgCtc.toFixed(1)} LPA`} icon="cash" tone="warning" />
          </ResponsiveGrid>

          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(admin)/approvals' as any)}>
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 350, delay: 120 }}>
              <View style={styles.pendingCard}>
                <View>
                  <Text style={styles.pendingEyebrow}>Action Needed</Text>
                  <Text style={styles.pendingTitle}>{pendingCount} companies pending approval</Text>
                </View>
                <Text style={styles.pendingLink}>Review now →</Text>
              </View>
            </MotiView>
          </TouchableOpacity>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 180 }}>
            <Card>
              <SectionHeader eyebrow="Analytics" title="Branch-wise Placements" />
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
                  color: (o = 1) => `rgba(31, 91, 255, ${o})`,
                  labelColor: (o = 1) => `rgba(91, 98, 114, ${o})`,
                  barPercentage: 0.6,
                }}
                style={styles.chart}
              />
            </Card>
          </MotiView>

          <SectionHeader
            eyebrow="Feed"
            title="Recent Activity"
            action={
              <Text style={styles.link} onPress={() => router.push('/(admin)/broadcast' as any)}>Broadcast</Text>
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
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.accent },
  heading: { fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1.2, marginTop: 4 },
  pendingCard: { backgroundColor: C.ink, borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, overflow: 'hidden' },
  pendingEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.amber },
  pendingTitle: { fontWeight: '800', fontSize: 17, color: '#FFFFFF', letterSpacing: -0.4, marginTop: 4 },
  pendingLink: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, flexShrink: 0 },
  chart: { borderRadius: 16, alignSelf: 'center', marginTop: 8 },
  link: { color: C.accent, fontWeight: '700', fontSize: 14 },
});
