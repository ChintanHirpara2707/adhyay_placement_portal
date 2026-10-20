import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
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
        Alert.alert('Error', 'Failed to fetch pending companies: ' + error.message);
        return;
      }

      setCompanies(data as any[] || []);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const handleApprove = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ approved: true })
        .eq('id', companyId);

      if (error) {
        Alert.alert('Error', 'Failed to approve company: ' + error.message);
        return;
      }

      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      Alert.alert('Success', 'Company has been approved.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const handleReject = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        Alert.alert('Error', 'Failed to reject company: ' + error.message);
        return;
      }

      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      Alert.alert('Success', 'Company registration has been rejected and deleted.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

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
                onPress={() => handleApprove(item.id)}
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
                onPress={() => handleReject(item.id)}
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
