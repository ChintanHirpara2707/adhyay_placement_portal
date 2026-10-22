import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';
import { dashboardFor } from '@/lib/authSession';
import { UserRole, useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Field, authInputProps, AuthPrimaryButton, authCardStyles } from '@/components/ui/AuthField';

type ChosenRole = 'student' | 'company';

const NO_TOAST = { visible: false, message: '', type: 'info' as const };
const UNIQUE_VIOLATION = '23505';

/**
 * First sign-in with Google: the account has no row in `users`, so there is no role yet.
 * The user picks Student or Company (never Admin - admin accounts are created manually) and we create
 * the `users` row plus the matching `students` / `companies` row.
 */
export default function ChooseRoleScreen() {
  const router = useRouter();
  const nav = useSafeNavigate();
  const { session, role: existingRole, setRole, setNeedsRole, setRoleResolved, logout } = useAuthStore();
  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const googleName: string = (meta.full_name ?? meta.name ?? '').toString().trim();
  const email = user?.email ?? '';

  const [role, setChosen] = useState<ChosenRole>('student');
  const [companyName, setCompanyName] = useState('');
  const [companyError, setCompanyError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  // Only a signed-in user without a users row belongs here (the global gate enforces this too).
  useEffect(() => {
    if (!session) router.replace('/(auth)/login' as any);
    else if (existingRole) router.replace(dashboardFor(existingRole) as any);
  }, [session, existingRole]);

  const signOut = async () => {
    await logout();
    nav.replace('/(auth)/login' as any);
  };

  const onContinue = async () => {
    if (busy.current || !user) return;
    if (role === 'company' && companyName.trim().length < 2) {
      setCompanyError('Enter your company name (at least 2 characters)');
      return;
    }
    setCompanyError(undefined);
    busy.current = true;
    setSaving(true);
    try {
      let finalRole: UserRole = role;

      const { error: userError } = await supabase.from('users').insert({ id: user.id, email, role });
      if (userError) {
        if (userError.code !== UNIQUE_VIOLATION) throw userError;
        // A row already exists (double tap / retry / another device): keep whatever role it has.
        const { data: existing, error: readError } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
        if (readError) throw readError;
        if (existing?.role) finalRole = existing.role as UserRole;
      }

      if (finalRole === 'student') {
        const { error } = await supabase.from('students').insert({ id: user.id, full_name: googleName || null });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
      } else if (finalRole === 'company') {
        const { error } = await supabase
          .from('companies')
          .insert({ id: user.id, company_name: companyName.trim(), approved: false });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
      }

      setRole(finalRole);
      setNeedsRole(false);
      setRoleResolved(true);
      nav.replace(dashboardFor(finalRole) as any); // a company then meets the pending-approval gate
    } catch (e: any) {
      showAlert('Could not finish setting up your account', e?.message || 'Something went wrong.', [
        { text: 'Sign out', style: 'destructive', onPress: signOut },
        { text: 'Try again' },
      ]);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const firstName = googleName.split(/\s+/)[0];

  return (
    <AuthLayout
      title={firstName ? `Welcome, ${firstName}` : 'Welcome'}
      subtitle={`Signed in as ${email || 'your Google account'}. Tell us how you will use the portal.`}
      toast={NO_TOAST}
      onDismissToast={() => {}}
    >
      <Field label="I am joining as">
        <SegmentedButtons
          value={role}
          onValueChange={(v) => setChosen(v as ChosenRole)}
          buttons={[
            { value: 'student', label: 'Student', checkedColor: C.accentStrong, uncheckedColor: C.muted, style: role === 'student' ? styles.segActive : styles.segInactive },
            { value: 'company', label: 'Company', checkedColor: C.accentStrong, uncheckedColor: C.muted, style: role === 'company' ? styles.segActive : styles.segInactive },
          ]}
          style={styles.segments}
        />
      </Field>

      {role === 'company' ? (
        <Field label="Company name" error={companyError}>
          <TextInput
            {...authInputProps}
            placeholder="e.g. Acme Technologies"
            value={companyName}
            onChangeText={(t) => {
              setCompanyName(t);
              if (companyError) setCompanyError(undefined);
            }}
            error={!!companyError}
            returnKeyType="go"
            onSubmitEditing={onContinue}
            style={authCardStyles.input}
          />
        </Field>
      ) : null}

      <Text style={styles.hint}>
        {role === 'company'
          ? 'Company accounts are reviewed by the placement cell before you can post jobs.'
          : 'You can complete your academic profile after continuing.'}
      </Text>

      <AuthPrimaryButton title="Continue" loading={saving} disabled={saving} onPress={onContinue} />

      <View style={styles.footer}>
        <Text style={styles.signOut} onPress={signOut} accessibilityRole="button">
          Sign out
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  segments: { backgroundColor: C.surface, borderRadius: 10 },
  segActive: { backgroundColor: C.accentSoft, borderRadius: 10 },
  segInactive: { backgroundColor: 'transparent', borderRadius: 10 },
  hint: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 4 },
  footer: { marginTop: 20, alignItems: 'center' },
  signOut: { color: C.accent, fontWeight: '600', fontSize: 14, paddingVertical: 12, paddingHorizontal: 12 },
});
