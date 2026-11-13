import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { removeCompanyLogoFile, uploadCompanyLogo, validateLogo } from '@/lib/companyLogo';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { NO_ROWS_MESSAGE, showAlert } from '@/lib/alert';
import { useLoadState } from '@/hooks/useLoadState';
import { useScreenReady } from '@/hooks/useScreenReady';
import { FormSkeleton } from '@/components/loading/FormSkeleton';
import { LoadError } from '@/components/loading/LoadError';
import { TextInput, Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Card, StatusChip } from '@/components/ui/kit';
import { getInitials } from '@/lib/format';

const companySchema = z.object({
  company_name: z.string().trim().min(2, { message: 'Company name must be at least 2 characters' }),
  description: z.string().trim().max(1000).optional().default(''),
  website: z.string().trim().max(255).refine((v) => v === '' || /^https?:\/\/.+/.test(v), { message: 'Website must start with http(s)://' }).optional().default(''),
});

type CompanyForm = z.infer<typeof companySchema>;

const resolver = (data: CompanyForm) => {
  const r = companySchema.safeParse(data);
  if (r.success) return { values: r.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  r.error.issues.forEach((e) => {
    errors[String(e.path[0])] = { type: e.code, message: e.message };
  });
  return { values: {}, errors };
};

export default function CompanyProfileScreen() {
  const { user } = useAuthStore();
  const { loading: fetching, error: loadError, begin, succeed, fail, end } = useLoadState('your profile');
  useScreenReady(!fetching);
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoBusy, setLogoBusy] = useState<'upload' | 'remove' | null>(null);
  const logoBusyRef = useRef(false);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CompanyForm>({
    resolver,
    defaultValues: { company_name: '', description: '', website: '' },
  });

  const loadProfile = useCallback(async () => {
    if (!user) return;
    begin();
    try {
      const { data, error } = await supabase.from('companies').select('company_name, description, website, approved, logo_url').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setLogoUrl((data as any).logo_url ?? null);
        setCompanyName((data as any).company_name ?? '');
        reset({ company_name: (data as any).company_name ?? '', description: (data as any).description ?? '', website: (data as any).website ?? '' });
        setApproved((data as any).approved ?? false);
      }
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  }, [user, reset, begin, succeed, fail, end]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveLogoUrl = async (url: string | null) => {
    const { data, error } = await supabase.from('companies').update({ logo_url: url }).eq('id', user!.id).select('id');
    if (error || !data || data.length === 0) throw new Error(error?.message ?? NO_ROWS_MESSAGE);
    setLogoUrl(url);
  };

  const pickLogo = async () => {
    if (!user || logoBusyRef.current) return;
    logoBusyRef.current = true;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const f = picked.assets[0];
      const file = { uri: f.uri, name: f.name, size: f.size, mimeType: f.mimeType };
      validateLogo(file);
      setLogoBusy('upload');
      await saveLogoUrl(await uploadCompanyLogo(user.id, file));
      showAlert('Logo updated', 'Students now see your logo on your drives.');
    } catch (e: any) {
      showAlert('Logo upload failed', e?.message || 'Could not upload the logo.');
    } finally {
      logoBusyRef.current = false;
      setLogoBusy(null);
    }
  };

  const removeLogo = () =>
    showAlert('Remove logo?', 'Students will see your company initial instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!user || logoBusyRef.current) return;
          logoBusyRef.current = true;
          setLogoBusy('remove');
          try {
            await saveLogoUrl(null);
            await removeCompanyLogoFile(user.id).catch(() => {}); // the profile no longer points at it either way
          } catch (e: any) {
            showAlert('Could not remove logo', e?.message || 'Try again.');
          } finally {
            logoBusyRef.current = false;
            setLogoBusy(null);
          }
        },
      },
    ]);

  const onSave = async (form: CompanyForm) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({ company_name: form.company_name.trim(), description: form.description?.trim() || null, website: form.website?.trim() || null })
        .eq('id', user.id)
        .select('id');
      if (error || !data || data.length === 0) {
        showAlert('Save Error', error?.message ?? NO_ROWS_MESSAGE);
        return;
      }
      reset(form);
      showAlert('Saved', 'Company profile updated.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching || loadError) {
    return (
      <View style={styles.container}>
        <TopNavbar title="Profile" subtitle="Company details" />
        <Screen>
          {fetching ? <FormSkeleton cards={1} fields={3} withHeader /> : <LoadError message={loadError} onRetry={loadProfile} />}
        </Screen>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TopNavbar title="Profile" subtitle="Company details" />
      <Screen>
        <View style={styles.column}>
          <Text style={styles.heading}>Company profile</Text>
          <Text style={styles.sub}>How students and the placement cell see your company.</Text>
        </View>
        <Card style={styles.column}>
          <View style={styles.avatarRow}>
            <CompanyLogo uri={logoUrl} name={companyName || getInitials(null, user?.email)} size={72} />
            <StatusChip label={approved ? 'Approved' : 'Pending Approval'} tone={approved ? 'success' : 'warning'} />
          </View>
          <Text style={styles.hint}>Approval status is read-only and managed by the placement cell.</Text>
          <View style={styles.logoRow}>
            <Button mode="outlined" icon="image-plus" onPress={pickLogo} loading={logoBusy === 'upload'} disabled={logoBusy !== null} textColor={C.accent} style={styles.logoBtn} contentStyle={styles.logoBtnContent}>
              {logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
            {logoUrl ? (
              <Button mode="outlined" icon="delete-outline" onPress={removeLogo} loading={logoBusy === 'remove'} disabled={logoBusy !== null} textColor={C.danger} style={styles.logoBtn} contentStyle={styles.logoBtnContent}>
                Remove
              </Button>
            ) : null}
          </View>
          <Text style={styles.hint}>PNG, JPG or WebP, up to 2 MB. A square logo works best.</Text>

          <Controller
            control={control}
            name="company_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput mode="outlined" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.company_name} style={styles.input} outlineColor={C.line} activeOutlineColor={C.accent} outlineStyle={styles.outline} />
                {errors.company_name ? <Text style={styles.errorText}>{errors.company_name.message}</Text> : null}
              </View>
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput mode="outlined" multiline numberOfLines={4} onBlur={onBlur} onChangeText={onChange} value={value} style={styles.input} outlineColor={C.line} activeOutlineColor={C.accent} outlineStyle={styles.outline} />
              </View>
            )}
          />
          <Controller
            control={control}
            name="website"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Website</Text>
                <TextInput mode="outlined" autoCapitalize="none" placeholder="https://…" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.website} style={styles.input} outlineColor={C.line} activeOutlineColor={C.accent} outlineStyle={styles.outline} />
                {errors.website ? <Text style={styles.errorText}>{errors.website.message}</Text> : null}
              </View>
            )}
          />
          <Button mode="contained" loading={saving} disabled={!isDirty || saving} onPress={handleSubmit(onSave, () => showAlert('Check the form', 'Fix the highlighted fields and save again.'))} buttonColor={C.accent} textColor="#FFFFFF" style={styles.save} contentStyle={styles.saveContent} labelStyle={styles.saveLabel}>
            Save Changes
          </Button>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.paper },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  heading: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  logoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  logoBtn: { borderRadius: 10, borderColor: C.line },
  logoBtnContent: { minHeight: 44 },
  hint: { fontSize: 13, color: C.muted, marginBottom: 8 },
  field: { marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 6 },
  input: { backgroundColor: C.card, fontSize: 16 },
  outline: { borderRadius: 10, borderWidth: 1 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 2 },
  save: { borderRadius: 10, marginTop: 16 },
  saveContent: { paddingVertical: 8, minHeight: 48 },
  saveLabel: { fontSize: 16, fontWeight: '600' },
});
