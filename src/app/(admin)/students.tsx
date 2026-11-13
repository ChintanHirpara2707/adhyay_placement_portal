import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/AppButton';
import { AdminDetailView } from '@/components/admin/AdminDetailView';
import { removeUser, setDebarred } from '@/lib/adminManage';
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
  resume_url: string | null;
  debarred: boolean | null;
  users: {
    email: string;
    created_at?: string | null;
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
          resume_url,
          debarred,
          users (
            email,
            created_at
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'debar' | 'remove' | null>(null);
  const busyRef = useRef(false);
  const selected = students.find((s) => s.id === selectedId) ?? null;

  const runAction = async (kind: 'debar' | 'remove', fn: () => Promise<void>, done: () => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    try {
      await fn();
      done();
    } catch (e: any) {
      showAlert('Action failed', e?.message || 'Something went wrong.');
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const toggleDebar = (s: Student) => {
    const next = !s.debarred;
    showAlert(
      next ? 'Debar student?' : 'Undebar student?',
      next
        ? `${s.full_name || 'This student'} will be signed out and blocked from logging in and applying.`
        : `${s.full_name || 'This student'} will be able to log in and apply again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Debar' : 'Undebar',
          style: next ? 'destructive' : 'default',
          onPress: () =>
            runAction(
              'debar',
              () => setDebarred('students', s.id, next),
              () => setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, debarred: next } : x)))
            ),
        },
      ]
    );
  };

  const removeStudent = (s: Student) =>
    showAlert(
      'Remove student?',
      `${s.full_name || 'This student'} and all their applications, interviews and notifications will be permanently deleted, and their login removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            runAction(
              'remove',
              () => removeUser(s.id),
              () => {
                setStudents((prev) => prev.filter((x) => x.id !== s.id));
                setSelectedId(null);
                showAlert('Removed', 'The student has been removed.');
              }
            ),
        },
      ]
    );

  if (selected) {
    const placed = placedIds.has(selected.id);
    return (
      <View style={styles.container}>
        <TopNavbar title="Students" subtitle="Student details" />
        <AdminDetailView
          title={selected.full_name || 'Incomplete Profile'}
          subtitle={selected.users?.email || 'No email'}
          chips={[
            { label: placed ? 'Placed' : 'Unplaced', tone: placed ? 'success' : 'muted' },
            ...(selected.debarred ? [{ label: 'Debarred', tone: 'danger' as const }] : []),
          ]}
          fields={[
            { label: 'Student ID', value: selected.id },
            { label: 'Email', value: selected.users?.email },
            { label: 'Phone', value: selected.phone },
            { label: 'Branch', value: selected.branch },
            { label: 'CGPA', value: selected.cgpa != null ? String(selected.cgpa) : null },
            { label: 'Backlogs', value: selected.backlog_count != null ? String(selected.backlog_count) : null },
            { label: 'Skills', value: Array.isArray(selected.skills) ? selected.skills.join(', ') : null },
            { label: 'Resume', value: selected.resume_url, resume: true },
            { label: 'Registered', value: selected.users?.created_at ? new Date(selected.users.created_at).toLocaleString() : null },
          ]}
          debarred={!!selected.debarred}
          busy={busy}
          onBack={() => setSelectedId(null)}
          onToggleDebar={() => toggleDebar(selected)}
          onRemove={() => removeStudent(selected)}
        />
      </View>
    );
  }

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
              render: (item) =>
                item.debarred ? (
                  <StatusChip label="Debarred" tone="danger" />
                ) : (
                  <StatusChip label={placedIds.has(item.id) ? 'Placed' : 'Unplaced'} tone={placedIds.has(item.id) ? 'success' : 'muted'} />
                ),
            },
            {
              key: 'details',
              title: '',
              flex: 1,
              render: (item) => (
                <Button mode="text" compact textColor={C.accent} onPress={() => setSelectedId(item.id)}>
                  Details
                </Button>
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
