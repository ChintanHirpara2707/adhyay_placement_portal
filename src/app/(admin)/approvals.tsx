import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';

interface PendingCompany {
  id: string;
  company_name: string;
  description: string;
  website: string;
  users: {
    email: string;
  } | null;
}

export default function ApprovalsScreen() {
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('approvals');
  useScreenReady(!loading);
  const [companies, setCompanies] = useState<PendingCompany[]>([]);

  const fetchPendingCompanies = async (isRefresh = false) => {
    begin(isRefresh);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          description,
          website,
          users (
            email
          )
        `)
        .eq('approved', false);

      if (error) throw error;

      setCompanies(data as any[] || []);
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  };

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  // Company ids with a decision in flight (ref = instant guard against double taps).
  const busyRef = useRef<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<string[]>([]);
  // Which action is running per id, so only the pressed button shows its spinner.
  const [busyKinds, setBusyKinds] = useState<Record<string, string>>({});
  const setBusy = (id: string, on: boolean, kind?: string) => {
    if (on) busyRef.current.add(id);
    else busyRef.current.delete(id);
    setBusyIds(Array.from(busyRef.current));
    setBusyKinds((prev) => {
      const next = { ...prev };
      if (on && kind) next[id] = kind;
      else delete next[id];
      return next;
    });
  };

  const approve = async (companyId: string) => {
    if (busyRef.current.has(companyId)) return;
    setBusy(companyId, true, 'approve');
    try {
      // select() detects an update that RLS filtered out (it would otherwise look successful).
      const { data, error } = await supabase
        .from('companies')
        .update({ approved: true })
        .eq('id', companyId)
        .select('id');

      if (error) {
        showAlert('Error', 'Failed to approve company: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        showAlert('Not approved', NO_ROWS_MESSAGE);
        return;
      }

      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      showAlert('Success', 'Company has been approved.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Something went wrong.');
    } finally {
      setBusy(companyId, false);
    }
  };

  const reject = async (companyId: string) => {
    if (busyRef.current.has(companyId)) return;
    setBusy(companyId, true, 'reject');
    try {
      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId)
        .select('id');

      if (error) {
        showAlert('Error', 'Failed to reject company: ' + error.message);
        return;
      }
      if (!data || data.length === 0) {
        showAlert('Not rejected', NO_ROWS_MESSAGE);
        return;
      }

      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      showAlert('Success', 'Company registration has been rejected and deleted.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Something went wrong.');
    } finally {
      setBusy(companyId, false);
    }
  };

  const handleApprove = (company: PendingCompany) =>
    showAlert('Approve company?', `${company.company_name || 'This company'} will be able to post drives and see applicants.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approve(company.id) },
    ]);

  const handleReject = (company: PendingCompany) =>
    showAlert('Reject and delete?', `${company.company_name || 'This company'}'s registration will be permanently deleted. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject(company.id) },
    ]);

  return (
    <View style={styles.container}>
      <TopNavbar title="Approvals" subtitle="Pending companies" />
      <PageHeader
        title="Company approvals"
        subtitle={`${companies.length} ${companies.length === 1 ? 'company awaits' : 'companies await'} a decision`}
      />
      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="job" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => fetchPendingCompanies()} />
        </View>
      ) : (
        <FlatList
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPendingCompanies(true)} tintColor={C.accent} />}
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.company_name || 'Unnamed Company'}
              </Text>
              <Text style={styles.emailText} numberOfLines={1}>
                {item.users?.email || 'No email associated'}
              </Text>
              {item.website ? (
                <Text style={styles.websiteText} numberOfLines={1}>
                  {item.website}
                </Text>
              ) : null}
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText} numberOfLines={4}>
                {item.description || 'No description provided.'}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => handleApprove(item)}
                loading={busyKinds[item.id] === 'approve'}
                disabled={busyIds.includes(item.id)}
                style={styles.actionBtn}
                contentStyle={styles.btnContent}
                buttonColor={C.accent}
                textColor="#FFFFFF"
                icon="check"
              >
                Approve
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleReject(item)}
                loading={busyKinds[item.id] === 'reject'}
                disabled={busyIds.includes(item.id)}
                style={styles.rejectBtn}
                contentStyle={styles.btnContent}
                textColor={C.danger}
                icon="close"
              >
                Reject
              </Button>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="checkbox-marked-circle-outline"
            title="Queue is clear"
            hint="No companies currently pending approval."
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
    gap: 10,
  },
  headerInfo: {
    gap: 2,
  },
  companyName: {
    fontWeight: '600',
    fontSize: 17,
    letterSpacing: -0.2,
    color: C.ink,
  },
  emailText: {
    color: C.muted,
    fontSize: 14,
  },
  websiteText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  descriptionText: {
    color: C.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
  },
  btnContent: { minHeight: 44 },
  rejectBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    borderColor: C.line,
  },
});
