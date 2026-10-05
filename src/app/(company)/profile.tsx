import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, ActivityIndicator } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { TopNavbar } from '@/components/TopNavbar';
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
        <ActivityIndicator size="large" color={Theme.colors.primaryAccent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TopNavbar title="Profile" subtitle="Company details" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(null, user?.email).charAt(0)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: approved ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.badgeText, { color: approved ? Theme.colors.success : Theme.colors.warning }]}>
                  {approved ? 'APPROVED' : 'PENDING APPROVAL'}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>Approval status is read-only and managed by the placement cell.</Text>

            <Controller
              control={control}
              name="company_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Company Name</Text>
                  <TextInput mode="outlined" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.company_name} style={styles.input} />
                  {errors.company_name ? <HelperText type="error" visible>{errors.company_name.message}</HelperText> : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput mode="outlined" multiline numberOfLines={4} onBlur={onBlur} onChangeText={onChange} value={value} style={styles.input} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="website"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Website</Text>
                  <TextInput mode="outlined" autoCapitalize="none" placeholder="https://…" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.website} style={styles.input} />
                  {errors.website ? <HelperText type="error" visible>{errors.website.message}</HelperText> : null}
                </View>
              )}
            />
            <Button mode="contained" loading={saving} disabled={!isDirty || saving} onPress={handleSubmit(onSave)} buttonColor={Theme.colors.primaryAccent} textColor="#fff" style={styles.save}>
              Save Changes
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  body: { padding: Theme.spacing.md, paddingBottom: 28 },
  card: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.lg },
  cardContent: { gap: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Theme.borderRadius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 12, color: Theme.colors.secondaryText },
  field: { marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: Theme.colors.secondaryText, marginBottom: 4 },
  input: { backgroundColor: Theme.colors.background, fontSize: 14 },
  save: { borderRadius: Theme.borderRadius.button, marginTop: 8 },
});
