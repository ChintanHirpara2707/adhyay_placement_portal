import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Text, TextInput } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip, EmptyState, PageHeader, pageColumn } from '@/components/ui/kit';

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
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('students');
  useScreenReady(!loading);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [placedIds, setPlacedIds] = useState<Set<string>>(new Set());

  const fetchAllStudents = async (isRefresh = false) => {
    begin(isRefresh);
    try {
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

      if (error) throw error;

      setStudents(data as any[] || []);
      const { data: placed, error: qErr1 } = await supabase.from('applications').select('student_id').eq('status', 'selected');
      if (qErr1) throw qErr1;
      setPlacedIds(new Set(((placed as any[]) ?? []).map((p) => p.student_id)));
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
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

  return (
    <View style={styles.container}>
      <TopNavbar title="Students" subtitle="Directory & placement" />
      <PageHeader title="Students" subtitle={`${filteredStudents.length} ${filteredStudents.length === 1 ? 'student' : 'students'} registered`} maxWidth={1000} />
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
          outlineStyle={{ borderRadius: 10, borderWidth: 1 }}
        />
      </View>

      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="application" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={() => fetchAllStudents()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAllStudents(true)} tintColor={C.accent} />}>
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
  searchBarContainer: {
    ...pageColumn(1000),
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    backgroundColor: C.card,
    fontSize: 16,
  },
  listContainer: {
    ...pageColumn(1000),
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  studentName: {
    fontWeight: '600',
    fontSize: 15,
    color: C.ink,
  },
  emailText: {
    color: C.muted,
    fontSize: 13,
  },
  branchText: {
    color: C.inkSoft,
    fontWeight: '600',
    fontSize: 14,
  },
  boldValue: {
    fontWeight: '600',
    color: C.ink,
    fontSize: 15,
  },
});
