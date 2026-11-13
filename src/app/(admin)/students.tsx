import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/AppButton';
import { AdminDetailView } from '@/components/admin/AdminDetailView';
import { DebarHistoryRow, fetchDebarHistory, removeUser, setDebarred } from '@/lib/adminManage';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useScreenReady } from '@/hooks/useScreenReady';
import { isNearEnd, useDebouncedValue, usePaginatedList } from '@/hooks/usePaginatedList';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Menu, Text, TextInput } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { DataTable } from '@/components/ui/DataTable';
import { PagedFooter } from '@/components/ui/PagedFooter';
import { StatusChip, EmptyState, PageHeader, FilterChips, pageColumn } from '@/components/ui/kit';
import { BRANCHES } from '@/constants/branches';
import { hasActiveStudentFilters, parseMinCgpa, PlacedFilter, sanitizeSearchTerm, StudentFilters } from '@/lib/adminFilters';

// One row of the `admin_student_list` view (supabase/16-master.sql): students + email + placed flag + application count.
interface Student {
  id: string;
  full_name: string | null;
  branch: string | null;
  cgpa: number | null;
  backlog_count: number | null;
  phone: string | null;
  skills: string[] | null;
  resume_url: string | null;
  debarred: boolean | null;
  debar_reason: string | null;
  email: string | null;
  registered_at: string | null;
  placed: boolean;
  app_count: number;
}

export default function StudentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [minCgpa, setMinCgpa] = useState('');
  const { placed: placedParam, t: placedStamp } = useLocalSearchParams<{ placed?: string; t?: string }>();
  const [placedFilter, setPlacedFilter] = useState<PlacedFilter>(placedParam === 'unplaced' ? 'unplaced' : 'all');
  const [branchMenu, setBranchMenu] = useState(false);

  // The dashboard shortcut opens this tab with ?placed=unplaced&t=<now>; the stamp makes every tap re-apply it.
  useEffect(() => {
    if (placedParam === 'unplaced' || placedParam === 'placed') setPlacedFilter(placedParam);
  }, [placedParam, placedStamp]);

  // Typing is debounced so each keystroke does not fire a query.
  const debouncedQuery = useDebouncedValue(searchQuery, 350);
  const debouncedCgpa = useDebouncedValue(minCgpa, 350);

  // Filters run in the database so every 20-row page is correct (a client-side filter would only see loaded pages).
  const { rows: students, setRows: setStudents, total, loading, refreshing, loadingMore, error: loadError, moreError, hasMore, loadMore, retryMore, refresh, reload } =
    usePaginatedList<Student>(
      async (from, to) => {
        let q = supabase.from('admin_student_list').select('*', { count: 'exact' });
        const term = sanitizeSearchTerm(debouncedQuery);
        if (term) q = q.or(`full_name.ilike.%${term}%,branch.ilike.%${term}%,email.ilike.%${term}%`);
        if (branchFilter !== 'all') q = q.eq('branch', branchFilter);
        const min = parseMinCgpa(debouncedCgpa);
        if (min !== null) q = q.gte('cgpa', min);
        if (placedFilter === 'placed') q = q.eq('placed', true);
        if (placedFilter === 'unplaced') q = q.eq('placed', false);
        const { data, error, count } = await q
          .order('full_name', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true })
          .range(from, to);
        if (error) throw error;
        return { rows: (data as Student[]) ?? [], total: count ?? null };
      },
      [debouncedQuery, debouncedCgpa, branchFilter, placedFilter],
      { reloadOnFocus: true }
    );
  useScreenReady(!loading);

  // Live: new sign-ups, profile edits and placements.
  useRealtimeRefresh([{ table: 'students' }, { table: 'applications' }], reload);

  const filters: StudentFilters = { query: searchQuery, branch: branchFilter, minCgpa, placed: placedFilter };
  const filtersActive = hasActiveStudentFilters(filters);
  const clearFilters = () => {
    setSearchQuery('');
    setBranchFilter('all');
    setMinCgpa('');
    setPlacedFilter('all');
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'debar' | 'remove' | null>(null);
  const busyRef = useRef(false);
  const selected = students.find((s) => s.id === selectedId) ?? null;
  const [history, setHistory] = useState<DebarHistoryRow[] | null | 'error'>(null);

  const loadHistory = (id: string) => {
    setHistory(null);
    fetchDebarHistory(id)
      .then(setHistory)
      .catch(() => setHistory('error'));
  };

  useEffect(() => {
    if (selectedId) loadHistory(selectedId);
  }, [selectedId]);

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

  const toggleDebar = (s: Student, reason: string) => {
    const next = !s.debarred;
    showAlert(
      next ? 'Debar student?' : 'Undebar student?',
      next
        ? `${s.full_name || 'This student'} will be blocked from logging in and applying. They will see this reason: "${reason}"`
        : `${s.full_name || 'This student'} will be able to log in and apply again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Debar' : 'Undebar',
          style: next ? 'destructive' : 'default',
          onPress: () =>
            runAction(
              'debar',
              () => setDebarred('students', s.id, next, reason),
              () => {
                setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, debarred: next, debar_reason: next ? reason : null } : x)));
                loadHistory(s.id);
              }
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
    return (
      <View style={styles.container}>
        <TopNavbar title="Students" subtitle="Student details" />
        <AdminDetailView
          title={selected.full_name || 'Incomplete Profile'}
          subtitle={selected.email || 'No email'}
          chips={[
            { label: selected.placed ? 'Placed' : 'Unplaced', tone: selected.placed ? 'success' : 'muted' },
            ...(selected.debarred ? [{ label: 'Debarred', tone: 'danger' as const }] : []),
          ]}
          fields={[
            { label: 'Student ID', value: selected.id },
            { label: 'Email', value: selected.email },
            { label: 'Phone', value: selected.phone },
            { label: 'Branch', value: selected.branch },
            { label: 'CGPA', value: selected.cgpa != null ? String(selected.cgpa) : null },
            { label: 'Backlogs', value: selected.backlog_count != null ? String(selected.backlog_count) : null },
            { label: 'Drives applied to', value: String(selected.app_count ?? 0) },
            { label: 'Skills', value: Array.isArray(selected.skills) ? selected.skills.join(', ') : null },
            { label: 'Resume', value: selected.resume_url, resume: true },
            { label: 'Registered', value: selected.registered_at ? new Date(selected.registered_at).toLocaleString() : null },
          ]}
          debarred={!!selected.debarred}
          debarReason={selected.debar_reason}
          history={history}
          busy={busy}
          onBack={() => setSelectedId(null)}
          onToggleDebar={(reason) => toggleDebar(selected, reason)}
          onRemove={() => removeStudent(selected)}
        />
      </View>
    );
  }

  const count = total ?? students.length;
  const onlyUnplaced = placedFilter === 'unplaced' && !searchQuery.trim() && branchFilter === 'all' && !minCgpa.trim();

  return (
    <View style={styles.container}>
      <TopNavbar title="Students" subtitle="Directory & placement" />
      <PageHeader
        title="Students"
        subtitle={
          loading
            ? 'Loading…'
            : onlyUnplaced
              ? `${count} ${count === 1 ? 'student is' : 'students are'} still unplaced`
              : filtersActive
                ? `${count} ${count === 1 ? 'student matches' : 'students match'}`
                : `${count} ${count === 1 ? 'student' : 'students'} registered`
        }
        maxWidth={1000}
      />
      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder="Search by name, email or branch"
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

      <FilterChips
        maxWidth={1000}
        value={placedFilter}
        onChange={setPlacedFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'placed', label: 'Placed' },
          { value: 'unplaced', label: 'Unplaced' },
        ]}
      />
      <View style={styles.filterRow}>
        <Menu
          visible={branchMenu}
          onDismiss={() => setBranchMenu(false)}
          anchor={
            <Button mode="outlined" icon="chevron-down" onPress={() => setBranchMenu(true)} textColor={branchFilter === 'all' ? C.muted : C.accent} style={styles.filterBtn} contentStyle={styles.filterBtnContent}>
              {branchFilter === 'all' ? 'All branches' : branchFilter}
            </Button>
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item title="All branches" onPress={() => { setBranchFilter('all'); setBranchMenu(false); }} />
          {BRANCHES.map((b) => (
            <Menu.Item key={b} title={b} onPress={() => { setBranchFilter(b); setBranchMenu(false); }} />
          ))}
        </Menu>
        <TextInput
          mode="outlined"
          dense
          label="Min CGPA"
          keyboardType="decimal-pad"
          value={minCgpa}
          onChangeText={setMinCgpa}
          style={styles.cgpaInput}
          outlineColor={C.line}
          activeOutlineColor={C.accent}
          outlineStyle={{ borderRadius: 10, borderWidth: 1 }}
        />
        {filtersActive ? (
          <Button mode="text" icon="filter-remove-outline" onPress={clearFilters} textColor={C.accent} compact>
            Clear filters
          </Button>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.listContainer}>
          <SkeletonList count={3} variant="application" />
        </View>
      ) : loadError ? (
        <View style={styles.listContainer}>
          <LoadError message={loadError} onRetry={refresh} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
          scrollEventThrottle={120}
          onScroll={(e) => {
            if (isNearEnd(e)) loadMore();
          }}
        >
          <DataTable
            columns={[
              {
                key: 'student',
                title: 'Student',
                flex: 2,
                render: (item) => (
                  <View>
                    <Text style={styles.studentName} numberOfLines={1}>{item.full_name || 'Incomplete Profile'}</Text>
                    <Text style={styles.emailText} numberOfLines={1}>{item.email || 'No email'}</Text>
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
                    <StatusChip label={item.placed ? 'Placed' : 'Unplaced'} tone={item.placed ? 'success' : 'muted'} />
                  ),
              },
              ...(placedFilter === 'unplaced'
                ? [
                    {
                      key: 'applications',
                      title: 'Applied to',
                      flex: 1,
                      render: (item: Student) => {
                        const n = item.app_count ?? 0;
                        return <Text style={n === 0 ? styles.noApps : styles.boldValue}>{n === 0 ? 'None yet' : `${n} ${n === 1 ? 'drive' : 'drives'}`}</Text>;
                      },
                    },
                  ]
                : []),
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
            rows={students}
            keyOf={(item) => item.id}
          />
          {students.length === 0 ? (
            <EmptyState
              icon="account-search-outline"
              title="No students found"
              hint={filtersActive ? 'No student matches these filters. Try clearing some.' : 'No students have registered yet.'}
              action={filtersActive ? <Button mode="outlined" onPress={clearFilters} textColor={C.accent} style={styles.clearBtn}>Clear filters</Button> : undefined}
            />
          ) : (
            <PagedFooter
              loadingMore={loadingMore}
              moreError={moreError}
              hasMore={hasMore}
              onRetry={retryMore}
              onLoadMore={loadMore}
              shown={students.length}
              total={total}
            />
          )}
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
  filterRow: {
    ...pageColumn(1000),
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  filterBtn: { borderRadius: 10, borderColor: C.line },
  filterBtnContent: { flexDirection: 'row-reverse', minHeight: 40 },
  cgpaInput: { width: 120, backgroundColor: C.card, fontSize: 15 },
  menuContent: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.line },
  clearBtn: { borderRadius: 10, borderColor: C.line, marginTop: 8 },
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
  noApps: {
    color: C.warning,
    fontWeight: '600',
    fontSize: 14,
  },
  boldValue: {
    fontWeight: '600',
    color: C.ink,
    fontSize: 15,
  },
});
