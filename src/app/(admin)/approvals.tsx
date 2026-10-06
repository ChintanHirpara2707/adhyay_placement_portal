import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { EmptyState } from '@/components/ui/kit';

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
      <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
        <Text style={styles.eyebrow}>Chapter 01 · Review</Text>
        <Text style={styles.heading}>Company approvals</Text>
        <Text style={styles.count}>{companies.length} awaiting decision</Text>
      </MotiView>
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
                buttonColor={C.ink}
                textColor="#FFFFFF"
                icon="check"
              >
                Approve
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleReject(item.id)}
                style={styles.rejectBtn}
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
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.accent, paddingHorizontal: 16, paddingTop: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -1, paddingHorizontal: 16, marginTop: 4 },
  count: { fontSize: 13, color: C.muted, paddingHorizontal: 16, marginTop: 4 },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
    gap: 10,
  },
  headerInfo: {
    gap: 2,
  },
  companyName: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.4,
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
    borderRadius: 14,
  },
  rejectBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.danger,
  },
});
