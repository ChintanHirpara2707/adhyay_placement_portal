import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip, EmptyState } from '@/components/ui/kit';

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
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Fetching student directory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Students" subtitle="Directory & placement" />
      <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
        <Text style={styles.eyebrow}>Chapter 03 · Talent</Text>
        <Text style={styles.heading}>Students</Text>
        <Text style={styles.count}>{filteredStudents.length} in directory</Text>
      </MotiView>
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder="Search by name or branch"
          mode="outlined"
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon="magnify" color={C.faint} />}
          style={styles.searchBar}
          outlineColor={C.line}
          activeOutlineColor={C.accent}
          outlineStyle={{ borderRadius: 14, borderWidth: 1.5 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        <DataTable
          columns={[
            {
              key: 'student',
              title: 'Student',
              flex: 2,
              render: (item) => (
                <View>
                  <Text style={styles.studentName} numberOfLines={1}>{item.full_name || 'Incomplete Profile'}</Text>
                  <Text style={styles.emailText} numberOfLines={1}>{item.users?.email || 'No email'}</Text>
                </View>
              ),
            },
            {
              key: 'branch',
              title: 'Branch',
              flex: 1,
              render: (item) => <Text style={styles.branchText}>{item.branch || 'N/A'}</Text>,
            },
            {
              key: 'cgpa',
              title: 'CGPA',
              flex: 1,
              render: (item) => <Text style={styles.boldValue}>{item.cgpa ?? 'N/A'}</Text>,
            },
            {
              key: 'status',
              title: 'Status',
              flex: 1,
              render: (item) => (
                <StatusChip label={placedIds.has(item.id) ? 'Placed' : 'Unplaced'} tone={placedIds.has(item.id) ? 'success' : 'muted'} />
              ),
            },
          ]}
          rows={filteredStudents}
          keyOf={(item) => item.id}
        />
        {filteredStudents.length === 0 ? (
          <EmptyState icon="account-search-outline" title="No students found" hint="Try a different search." />
        ) : null}
      </ScrollView>
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    backgroundColor: C.card,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  studentName: {
    fontWeight: '800',
    fontSize: 15,
    color: C.ink,
  },
  emailText: {
    color: C.muted,
    fontSize: 12,
  },
  branchText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  boldValue: {
    fontWeight: '800',
    color: C.ink,
    fontSize: 15,
  },
});
