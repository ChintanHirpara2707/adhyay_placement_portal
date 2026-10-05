import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
import { StatCard } from '@/components/StatCard';
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
    <View style={styles.container}>
      <WebOnlyDecorations />
      <TopNavbar title="Dashboard" subtitle="Admin analytics" />
      {loading ? (
        <View style={styles.loading}>
          <View style={styles.grid}>
            <Skeleton height={110} borderRadius={12} style={{ width: '48%' }} />
            <Skeleton height={110} borderRadius={12} style={{ width: '48%' }} />
          </View>
          <Skeleton height={240} borderRadius={12} style={{ marginTop: 20 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.grid}>
            <StatCard label="Students" value={totalStudents} icon="account-multiple" delay={30} />
            <StatCard label="Companies" value={totalCompanies} icon="domain" accent="#7C3AED" delay={70} />
            <StatCard label="Placement" value={`${placementPct.toFixed(1)}%`} icon="chart-bar" accent={Theme.colors.success} delay={110} />
            <StatCard label="Avg CTC" value={`${avgCtc.toFixed(1)} LPA`} icon="cash" accent={Theme.colors.warning} delay={150} />
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(admin)/approvals' as any)}>
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 280, delay: 180 }}>
              <Card style={styles.pendingCard} elevation={1}>
                <Card.Content style={styles.pendingContent}>
                  <Text style={styles.pendingTitle}>{pendingCount} companies pending approval</Text>
                  <Text style={styles.pendingLink}>Review now →</Text>
                </Card.Content>
              </Card>
            </MotiView>
          </TouchableOpacity>

          <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 210 }}>
            <Card style={styles.chartCard} elevation={1}>
              <Card.Content>
                <Text style={styles.chartTitle}>Branch-wise Placements</Text>
                <BarChart
                  data={{ labels: branchLabels, datasets: [{ data: branchValues }] }}
                  width={Math.min(screenWidth - 64, 600)}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: Theme.colors.background,
                    backgroundGradientFrom: Theme.colors.background,
                    backgroundGradientTo: Theme.colors.background,
                    decimalPlaces: 0,
                    color: (o = 1) => `rgba(30, 58, 138, ${o})`,
                    labelColor: (o = 1) => `rgba(107, 114, 128, ${o})`,
                    barPercentage: 0.6,
                  }}
                  style={styles.chart}
                />
              </Card.Content>
            </Card>
          </MotiView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.link} onPress={() => router.push('/(admin)/broadcast' as any)}>Broadcast</Text>
          </View>
          <Card style={styles.feed} elevation={1}>
            <Card.Content style={styles.feedContent}>
              {recent.length === 0 ? (
                <Text style={styles.empty}>No pending requests. All caught up.</Text>
              ) : (
                recent.map((r) => <ActivityFeedItem key={r.id} icon="domain-plus" message={r.message} timestamp={r.created_at} />)
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loading: { padding: Theme.spacing.lg },
  body: { padding: Theme.spacing.lg, gap: Theme.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm },
  pendingCard: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: Theme.borderRadius.lg },
  pendingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingTitle: { fontWeight: '700', color: Theme.colors.primaryText },
  pendingLink: { color: Theme.colors.primaryAccent, fontWeight: '700' },
  chartCard: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.card },
  chartTitle: { ...Theme.typography.sectionHeader, textAlign: 'center', marginBottom: Theme.spacing.md },
  chart: { borderRadius: Theme.borderRadius.card, alignSelf: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.primaryText },
  link: { color: Theme.colors.primaryAccent, fontWeight: '600', fontSize: 13 },
  feed: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  feedContent: { paddingVertical: 6 },
  empty: { fontSize: 13, color: Theme.colors.secondaryText, textAlign: 'center', paddingVertical: 10 },
});
