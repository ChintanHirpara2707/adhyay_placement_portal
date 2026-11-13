import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { showAlert } from '@/lib/alert';
import { useDebouncedValue, usePaginatedList } from '@/hooks/usePaginatedList';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { sanitizeSearchTerm } from '@/lib/adminFilters';
import { PagedFooter } from '@/components/ui/PagedFooter';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Button } from '@/components/ui/AppButton';
import { AdminDetailView } from '@/components/admin/AdminDetailView';
import { DebarHistoryRow, fetchDebarHistory, removeUser, setDebarred } from '@/lib/adminManage';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { EmptyState, FilterChips, PageHeader, StatusChip, pageColumn } from '@/components/ui/kit';

interface Company {
  id: string;
  company_name: string | null;
  description: string | null;
  website: string | null;
  approved: boolean | null;
  debarred: boolean | null;
  debar_reason: string | null;
  rejection_reason: string | null;
  email: string | null;
  registered_at: string | null;
}

const statusOf = (c: Company): { label: string; tone: 'success' | 'warning' | 'danger' } =>
  c.debarred
    ? { label: 'Debarred', tone: 'danger' }
    : c.approved
      ? { label: 'Approved', tone: 'success' }
      : c.rejection_reason
        ? { label: 'Rejected', tone: 'danger' }
        : { label: 'Pending', tone: 'warning' };

export default function CompaniesScreen() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'debarred'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'debar' | 'remove' | null>(null);
  const busyRef = useRef(false);
  const debouncedQuery = useDebouncedValue(query, 350);

  // Search + status run in the database (view `admin_company_list`), 20 rows per page.
  const { rows: companies, setRows: setCompanies, total, loading, refreshing, loadingMore, error: loadError, moreError, hasMore, loadMore, retryMore, refresh, reload } =
    usePaginatedList<Company>(
      async (from, to) => {
        let qy = supabase.from('admin_company_list').select('*', { count: 'exact' });
        const term = sanitizeSearchTerm(debouncedQuery);
        if (term) qy = qy.or(`company_name.ilike.%${term}%,email.ilike.%${term}%`);
        // Same precedence as the status chip: debarred, then approved, then rejected, then pending.
        if (statusFilter === 'debarred') qy = qy.eq('debarred', true);
        else if (statusFilter === 'approved') qy = qy.eq('debarred', false).eq('approved', true);
        else if (statusFilter === 'rejected') qy = qy.eq('debarred', false).eq('approved', false).not('rejection_reason', 'is', null);
        else if (statusFilter === 'pending') qy = qy.eq('debarred', false).eq('approved', false).is('rejection_reason', null);
        const { data, error, count } = await qy
          .order('company_name', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true })
          .range(from, to);
        if (error) throw error;
        return { rows: (data as Company[]) ?? [], total: count ?? null };
      },
      [debouncedQuery, statusFilter],
      { reloadOnFocus: true }
    );
  useScreenReady(!loading);

  // Live: new registrations, approvals and rejections.
  useRealtimeRefresh([{ table: 'companies' }], reload);

  const filtered = companies;
  const filtersActive = query.trim() !== '' || statusFilter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
  };
  const selected = companies.find((c) => c.id === selectedId) ?? null;
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

  const toggleDebar = (c: Company, reason: string) => {
    const next = !c.debarred;
    showAlert(
      next ? 'Debar company?' : 'Undebar company?',
      next
        ? `${c.company_name || 'This company'} will be blocked from logging in and posting drives. They will see this reason: "${reason}"`
        : `${c.company_name || 'This company'} will be able to log in and post drives again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Debar' : 'Undebar',
          style: next ? 'destructive' : 'default',
          onPress: () =>
            runAction(
              'debar',
              () => setDebarred('companies', c.id, next, reason),
              () => {
                setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, debarred: next, debar_reason: next ? reason : null } : x)));
                loadHistory(c.id);
              }
            ),
        },
      ]
    );
  };

  const removeCompany = (c: Company) =>
    showAlert(
      'Remove company?',
      `${c.company_name || 'This company'}, all its job postings, applications and interviews will be permanently deleted, and its login removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            runAction(
              'remove',
              () => removeUser(c.id),
              () => {
                setCompanies((prev) => prev.filter((x) => x.id !== c.id));
                setSelectedId(null);
                showAlert('Removed', 'The company has been removed.');
              }
            ),
        },
      ]
    );

  if (selected) {
    const st = statusOf(selected);
    return (
      <View style={styles.container}>
        <TopNavbar title="Companies" subtitle="Company details" showBack />
        <AdminDetailView
          title={selected.company_name || 'Unnamed Company'}
          subtitle={selected.email || 'No email'}
          chips={[
            { label: selected.approved ? 'Approved' : 'Pending approval', tone: selected.approved ? 'success' : 'warning' },
            ...(selected.debarred ? [{ label: 'Debarred', tone: 'danger' as const }] : []),
          ]}
          fields={[
            { label: 'Company ID', value: selected.id },
            { label: 'Email', value: selected.email },
            { label: 'Website', value: selected.website, link: true },
            { label: 'Description', value: selected.description },
            { label: 'Status', value: st.label },
            { label: 'Rejection reason', value: selected.rejection_reason },
            { label: 'Registered', value: selected.registered_at ? new Date(selected.registered_at).toLocaleString() : null },
          ]}
          debarred={!!selected.debarred}
          debarReason={selected.debar_reason}
          history={history}
          busy={busy}
          onBack={() => setSelectedId(null)}
          onToggleDebar={(reason) => toggleDebar(selected, reason)}
          onRemove={() => removeCompany(selected)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Companies" subtitle="Directory & status" showBack />
      <PageHeader
        title="Companies"
        subtitle={
          loading
            ? 'Loading…'
            : filtersActive
              ? `${total ?? companies.length} ${(total ?? companies.length) === 1 ? 'company matches' : 'companies match'}`
              : `${total ?? companies.length} ${(total ?? companies.length) === 1 ? 'company' : 'companies'} registered`
        }
      />
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by name or email"
          mode="outlined"
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" color={C.faint} />}
          style={styles.search}
          outlineColor={C.line}
          activeOutlineColor={C.accent}
          outlineStyle={{ borderRadius: 10, borderWidth: 1 }}
        />
      </View>
      <FilterChips
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'approved', label: 'Approved' },
          { value: 'pending', label: 'Pending' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'debarred', label: 'Debarred' },
        ]}
      />
      {loading ? (
        <View style={styles.list}>
          <SkeletonList count={3} variant="job" />
        </View>
      ) : loadError ? (
        <View style={styles.list}>
          <LoadError message={loadError} onRetry={refresh} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <PagedFooter loadingMore={loadingMore} moreError={moreError} hasMore={hasMore} onRetry={retryMore} shown={companies.length} total={total} />
          }
          renderItem={({ item }) => {
            const st = statusOf(item);
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.company_name || 'Unnamed Company'}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {item.email || 'No email'}
                    </Text>
                  </View>
                  <StatusChip label={st.label} tone={st.tone} />
                </View>
                <Button mode="outlined" icon="eye-outline" textColor={C.accent} style={styles.open} onPress={() => setSelectedId(item.id)}>
                  Open details
                </Button>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="domain"
              title={companies.length === 0 ? 'No companies yet' : 'No companies found'}
              hint={companies.length === 0 ? 'Companies appear here once they register.' : 'No company matches these filters.'}
              action={
                filtersActive && companies.length > 0 ? (
                  <Button mode="outlined" onPress={clearFilters} textColor={C.accent} style={styles.open}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  searchWrap: { ...pageColumn(720), paddingTop: 8, paddingBottom: 4 },
  search: { backgroundColor: C.card, fontSize: 16 },
  list: { ...pageColumn(720), paddingTop: 8, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  info: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  email: { fontSize: 14, color: C.muted },
  open: { borderRadius: 10, borderColor: C.line },
});
