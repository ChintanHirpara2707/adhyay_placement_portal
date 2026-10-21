import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
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
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<PendingCompany[]>([]);

  const fetchPendingCompanies = async () => {
    try {
      setLoading(true);
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

      if (error) {
        showAlert('Error', 'Failed to fetch pending companies: ' + error.message);
        return;
      }

      setCompanies(data as any[] || []);
    } catch (e: any) {
      showAlert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  // Company ids with a decision in flight (ref = instant guard against double taps).
  const busyRef = useRef<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const setBusy = (id: string, on: boolean) => {
    if (on) busyRef.current.add(id);
    else busyRef.current.delete(id);
    setBusyIds(Array.from(busyRef.current));
  };

  const approve = async (companyId: string) => {
    if (busyRef.current.has(companyId)) return;
    setBusy(companyId, true);
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
    setBusy(companyId, true);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Fetching pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Approvals" subtitle="Pending companies" />
      <PageHeader
        title="Company approvals"
        subtitle={`${companies.length} ${companies.length === 1 ? 'company awaits' : 'companies await'} a decision`}
      />
      <FlatList
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
                loading={busyIds.includes(item.id)}
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
