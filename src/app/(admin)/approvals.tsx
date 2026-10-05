import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';

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
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Approvals" subtitle="Pending companies" />
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.headerInfo}>
                <Text style={styles.companyName}>
                  {item.company_name || 'Unnamed Company'}
                </Text>
                <Text style={styles.emailText}>
                  {item.users?.email || 'No email associated'}
                </Text>
                {item.website && (
                  <Text style={styles.websiteText}>
                    {item.website}
                  </Text>
                )}
              </View>

              <Divider style={styles.divider} />

              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionText}>
                  {item.description || 'No description provided.'}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => handleApprove(item.id)}
                  style={styles.actionBtn}
                  buttonColor={Theme.colors.primary}
                  textColor="#FFFFFF"
                  icon="check"
                >
                  Approve
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleReject(item.id)}
                  style={styles.rejectBtn}
                  textColor={Theme.colors.error}
                  icon="close"
                >
                  Reject
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No companies currently pending approval.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.body,
  },
  listContainer: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardContent: {
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  headerInfo: {
    gap: 4,
  },
  companyName: {
    fontWeight: Theme.typography.weights.bold as any,
    fontSize: Theme.typography.sizes.cardTitle,
    color: Theme.colors.textPrimary,
  },
  emailText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.body,
  },
  websiteText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.sizes.caption,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: Theme.colors.border,
  },
  descriptionSection: {
    paddingVertical: 4,
  },
  descriptionText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.body,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Theme.borderRadius.button,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: Theme.borderRadius.button,
    borderColor: Theme.colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
    marginTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.body,
  },
});
