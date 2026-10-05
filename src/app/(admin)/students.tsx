import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Card, Text, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';

interface Student {
  id: string;
  full_name: string;
  branch: string;
  cgpa: number;
  backlog_count: number;
  phone: string;
  skills: string[] | null;
  users: {
    email: string;
  } | null;
}

export default function StudentsScreen() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [placedIds, setPlacedIds] = useState<Set<string>>(new Set());

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          branch,
          cgpa,
          backlog_count,
          phone,
          skills,
          users (
            email
          )
        `);

      if (error) {
        Alert.alert('Error', 'Failed to retrieve student directory: ' + error.message);
        return;
      }

      setStudents(data as any[] || []);
      const { data: placed } = await supabase.from('applications').select('student_id').eq('status', 'selected');
      setPlacedIds(new Set(((placed as any[]) ?? []).map((p) => p.student_id)));
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStudents();
  }, []);

  const searchFilter = (list: Student[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => (s.full_name ?? '').toLowerCase().includes(q) || (s.branch ?? '').toLowerCase().includes(q)
    );
  };

  // Client-side search logic
  const filteredStudents = searchFilter(students);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching student directory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Students" subtitle="Directory & placement" />
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder="Search by Student Name"
          mode="outlined"
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon="magnify" color={Theme.colors.textSecondary} />}
          style={styles.searchBar}
          outlineColor={Theme.colors.border}
          activeOutlineColor={Theme.colors.primary}
          outlineStyle={{ borderRadius: Theme.borderRadius.input }}
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentName}>
                  {item.full_name || 'Incomplete Profile'}
                </Text>
                <View style={styles.headerBadges}>
                  <Text style={styles.branchText}>
                    {item.branch || 'Branch N/A'}
                  </Text>
                  <View style={[styles.placedPill, { backgroundColor: placedIds.has(item.id) ? '#D1FAE5' : '#F3F4F6' }]}>
                    <Text style={[styles.placedText, { color: placedIds.has(item.id) ? Theme.colors.success : Theme.colors.secondaryText }]}>
                      {placedIds.has(item.id) ? 'PLACED' : 'UNPLACED'}
                    </Text>
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.label}>CGPA</Text>
                  <Text style={styles.boldValue}>{item.cgpa ?? 'N/A'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.label}>Backlogs</Text>
                  <Text style={styles.boldValue}>{item.backlog_count ?? 0}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.boldValue}>{item.phone || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.contactSection}>
                <Text style={styles.emailText}>
                  {item.users?.email || 'No email associated'}
                </Text>
              </View>

              {item.skills && item.skills.length > 0 && (
                <View style={styles.skillsSection}>
                  <Text style={styles.skillsLabel}>Skills:</Text>
                  <View style={styles.skillsList}>
                    {item.skills.map((skill, index) => (
                      <View key={index} style={styles.skillBadge}>
                        <Text style={styles.skillBadgeText}>
                          {skill}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No students found.
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
  searchBarContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchBar: {
    backgroundColor: Theme.colors.background,
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
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontWeight: Theme.typography.weights.bold as any,
    fontSize: Theme.typography.sizes.cardTitle,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  branchText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.weights.medium as any,
    fontSize: Theme.typography.sizes.body,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.pill,
  },
  placedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    marginVertical: 4,
    backgroundColor: Theme.colors.border,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailCol: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.caption,
    marginBottom: 2,
  },
  boldValue: {
    fontWeight: Theme.typography.weights.bold as any,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.body,
  },
  contactSection: {
    paddingVertical: 2,
  },
  emailText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.caption,
  },
  skillsSection: {
    marginTop: 4,
    gap: 4,
  },
  skillsLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.caption,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillBadge: {
    backgroundColor: Theme.colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.pill,
  },
  skillBadgeText: {
    fontSize: Theme.typography.sizes.caption,
    color: Theme.colors.textPrimary,
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
