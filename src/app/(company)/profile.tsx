import React, { useEffect, useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
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
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CompanyForm>({
    resolver,
    defaultValues: { company_name: '', description: '', website: '' },
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('companies').select('company_name, description, website, approved').eq('id', user.id).maybeSingle();
        if (error) {
          Alert.alert('Error', 'Failed to fetch company profile: ' + error.message);
          return;
        }
        if (data) {
          reset({ company_name: (data as any).company_name ?? '', description: (data as any).description ?? '', website: (data as any).website ?? '' });
          setApproved((data as any).approved ?? false);
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [user, reset]);

  const onSave = async (form: CompanyForm) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ company_name: form.company_name.trim(), description: form.description?.trim() || null, website: form.website?.trim() || null })
        .eq('id', user.id);
      if (error) {
        Alert.alert('Save Error', error.message);
        return;
      }
      reset(form);
      Alert.alert('Saved', 'Company profile updated.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.accent} />
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(null, user?.email).charAt(0)}</Text>
            </View>
            <StatusChip label={approved ? 'Approved' : 'Pending Approval'} tone={approved ? 'success' : 'warning'} />
          </View>
          <Text style={styles.hint}>Approval status is read-only and managed by the placement cell.</Text>

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
          <Button mode="contained" loading={saving} disabled={!isDirty || saving} onPress={handleSubmit(onSave)} buttonColor={C.accent} textColor="#FFFFFF" style={styles.save} contentStyle={styles.saveContent} labelStyle={styles.saveLabel}>
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
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.accentStrong, fontWeight: '700', fontSize: 24 },
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
