import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text, TextInput } from 'react-native-paper';
import { showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { SkeletonList } from '@/components/loading/Skeleton';
import { LoadError } from '@/components/loading/LoadError';
import { Button } from '@/components/ui/AppButton';
import { AdminDetailView } from '@/components/admin/AdminDetailView';
import { removeUser, setDebarred } from '@/lib/adminManage';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { EmptyState, PageHeader, StatusChip, pageColumn } from '@/components/ui/kit';

interface Company {
  id: string;
  company_name: string | null;
  description: string | null;
  website: string | null;
  approved: boolean | null;
  debarred: boolean | null;
  users: { email: string; created_at?: string | null } | null;
}

const statusOf = (c: Company): { label: string; tone: 'success' | 'warning' | 'danger' } =>
  c.debarred ? { label: 'Debarred', tone: 'danger' } : c.approved ? { label: 'Approved', tone: 'success' } : { label: 'Pending', tone: 'warning' };

export default function CompaniesScreen() {
  const { loading, refreshing, error: loadError, begin, succeed, fail, end } = useLoadState('companies');
  useScreenReady(!loading);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'debar' | 'remove' | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(
    async (isRefresh = false) => {
      begin(isRefresh);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name, description, website, approved, debarred, users(email, created_at)')
          .order('company_name', { ascending: true });
        if (error) throw error;
        setCompanies((data as any[]) ?? []);
        succeed();
      } catch (e: any) {
        fail(e);
      } finally {
        end();
      }
    },
    [begin, succeed, fail, end]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? companies.filter((c) => (c.company_name ?? '').toLowerCase().includes(q) || (c.users?.email ?? '').toLowerCase().includes(q))
    : companies;
  const selected = companies.find((c) => c.id === selectedId) ?? null;

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

  const toggleDebar = (c: Company) => {
    const next = !c.debarred;
    showAlert(
      next ? 'Debar company?' : 'Undebar company?',
      next
        ? `${c.company_name || 'This company'} will be signed out and blocked from logging in and posting drives.`
        : `${c.company_name || 'This company'} will be able to log in and post drives again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Debar' : 'Undebar',
          style: next ? 'destructive' : 'default',
          onPress: () =>
            runAction(
              'debar',
              () => setDebarred('companies', c.id, next),
              () => setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, debarred: next } : x)))
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
          subtitle={selected.users?.email || 'No email'}
          chips={[
            { label: selected.approved ? 'Approved' : 'Pending approval', tone: selected.approved ? 'success' : 'warning' },
            ...(selected.debarred ? [{ label: 'Debarred', tone: 'danger' as const }] : []),
          ]}
          fields={[
            { label: 'Company ID', value: selected.id },
            { label: 'Email', value: selected.users?.email },
            { label: 'Website', value: selected.website, link: true },
            { label: 'Description', value: selected.description },
            { label: 'Status', value: st.label },
            { label: 'Registered', value: selected.users?.created_at ? new Date(selected.users.created_at).toLocaleString() : null },
          ]}
          debarred={!!selected.debarred}
          busy={busy}
          onBack={() => setSelectedId(null)}
          onToggleDebar={() => toggleDebar(selected)}
          onRemove={() => removeCompany(selected)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Companies" subtitle="Directory & status" showBack />
      <PageHeader title="Companies" subtitle={`${filtered.length} ${filtered.length === 1 ? 'company' : 'companies'} registered`} />
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
      {loading ? (
        <View style={styles.list}>
          <SkeletonList count={3} variant="job" />
        </View>
      ) : loadError ? (
        <View style={styles.list}>
          <LoadError message={loadError} onRetry={() => load()} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.accent} />}
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
                      {item.users?.email || 'No email'}
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
              hint={companies.length === 0 ? 'Companies appear here once they register.' : 'Try a different search.'}
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
