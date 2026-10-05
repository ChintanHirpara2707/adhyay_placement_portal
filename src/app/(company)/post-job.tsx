import { TopNavbar } from '@/components/TopNavbar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

const postJobSchema = z.object({
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters' }),
  description: z.string().trim().min(10, { message: 'Description must be at least 10 characters' }),
  ctc: z.coerce.number().positive({ message: 'CTC must be a positive number' }),
  min_cgpa: z.coerce.number().min(0).max(10, { message: 'Min CGPA must be between 0 and 10' }),
  eligible_branches: z.array(z.string()).min(1, { message: 'Select at least one eligible branch' }),
  backlog_allowed: z.boolean(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }),
  total_rounds: z.coerce.number().int().min(1, { message: 'At least 1 round' }).max(10, { message: 'Max 10 rounds' }),
  round_names: z.array(z.string()),
  job_profiles: z.array(z.string()),
  stipend: z.string().trim().max(50).optional().default(''),
  bond_years: z.string().trim().max(50).optional().default(''),
  location: z.string().trim().max(255).optional().default(''),
  round_dates: z.array(z.string()).optional().default([]),
}).refine((v) => v.round_names.filter((s) => s.trim() !== '').length === v.total_rounds, {
  message: 'Name every round — one name per round',
  path: ['round_names'],
}).refine((v) => v.job_profiles.filter((s) => s.trim() !== '').length >= 1, {
  message: 'Add at least one role offered',
  path: ['job_profiles'],
}).refine((v) => (v.stipend ?? '').trim() === '' || (!Number.isNaN(Number(v.stipend)) && Number(v.stipend) > 0), {
  message: 'Stipend must be a positive number',
  path: ['stipend'],
}).refine((v) => (v.bond_years ?? '').trim() === '' || (!Number.isNaN(Number(v.bond_years)) && Number(v.bond_years) >= 0), {
  message: 'Bond years must be a number',
  path: ['bond_years'],
});

type PostJobFormData = z.infer<typeof postJobSchema>;

const postJobResolver = (data: PostJobFormData) => {
  const result = postJobSchema.safeParse(data);
  if (result.success) {
    return {
      values: result.data,
      errors: {},
    };
  }

  const errors: Record<string, { type: string; message: string }> = {};
  result.error.issues.forEach((err) => {
    const field = err.path[0] as string;
    errors[field] = {
      type: err.code,
      message: err.message,
    };
  });

  return {
    values: {},
    errors,
  };
};

const BRANCHES = [
  "BCA",
  "MCA",
  "BSc.IT",
  "MSc.IT",
  "BSc.CS",
  "MSc.CS",
  "CE",
  "CSE",
  "IT",
  "EE",
  "ECE",
  "EEE",
  "EIE",
  "AI-DS",
  "AIML",
  "CS-BS",
];

export default function PostJobScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PostJobFormData>({
    resolver: postJobResolver,
    defaultValues: {
      title: '',
      description: '',
      ctc: 0,
      min_cgpa: 0,
      eligible_branches: [],
      backlog_allowed: false,
      deadline: '',
      total_rounds: 1,
      round_names: [''],
      job_profiles: [''],
      stipend: '',
      bond_years: '',
      location: '',
      round_dates: [''],
    },
  });

  const watchedRounds = watch('total_rounds');
  const watchedDates = watch('round_dates');

  const setRounds = (n: number) => {
    const clamped = Math.min(10, Math.max(1, Math.floor(n) || 1));
    const current = watch('round_names') ?? [];
    const resized = Array.from({ length: clamped }, (_, i) => current[i] ?? '');
    setValue('round_names', resized, { shouldValidate: true });
    const currentDates = watch('round_dates') ?? [];
    setValue('round_dates', Array.from({ length: clamped }, (_, i) => currentDates[i] ?? ''), { shouldValidate: false });
    setValue('total_rounds', clamped, { shouldValidate: true });
  };

  const setRoundDate = (index: number, value: string) => {
    const currentDates = [...(watch('round_dates') ?? [])];
    currentDates[index] = value;
    setValue('round_dates', currentDates, { shouldValidate: false });
  };

  const onSubmit = async (data: PostJobFormData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    setLoading(true);

    try {
      const deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) {
        Alert.alert('Validation Error', 'Please enter a valid date.');
        setLoading(false);
        return;
      }

      const roundNames = data.round_names.map((s) => s.trim()).filter(Boolean);
      const profiles = data.job_profiles.map((s) => s.trim()).filter(Boolean);
      const stipendVal = (data.stipend ?? '').trim() === '' ? null : Number(data.stipend);
      const bondVal = (data.bond_years ?? '').trim() === '' ? null : Number(data.bond_years);
      const locationVal = (data.location ?? '').trim() === '' ? null : data.location.trim();
      const roundDates = Array.from({ length: data.total_rounds }, (_, i) => ((data.round_dates ?? [])[i] ?? '').trim());

      const { error } = await supabase
        .from('job_postings')
        .insert({
          company_id: user.id,
          title: data.title,
          description: data.description,
          ctc: data.ctc,
          min_cgpa: data.min_cgpa,
          eligible_branches: data.eligible_branches,
          backlog_allowed: data.backlog_allowed,
          deadline: deadlineDate.toISOString(),
          status: 'open',
          total_rounds: data.total_rounds,
          round_names: roundNames,
          job_profiles: profiles,
          stipend: stipendVal,
          bond_years: bondVal,
          location: locationVal,
          round_dates: roundDates,
        });

      if (error) {
        Alert.alert('Database Error', 'Failed to publish job: ' + error.message);
        return;
      }

      // Redirect immediately (replace: no back-navigation into the filled form).
      router.replace('/(company)/my-jobs' as any);
    } catch (e: any) {
      Alert.alert('Unexpected Error', e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <TopNavbar title="Post Job" subtitle="Create opening" />
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.cardContent}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Job Title</Text>
                  <TextInput
                    mode="outlined"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.title}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.title && (
                    <HelperText type="error" visible={!!errors.title} style={styles.errorText}>
                      {errors.title.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Job Description</Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.description}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.description && (
                    <HelperText type="error" visible={!!errors.description} style={styles.errorText}>
                      {errors.description.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="ctc"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>CTC (in LPA)</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value === 0 ? '' : value.toString()}
                    error={!!errors.ctc}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.ctc && (
                    <HelperText type="error" visible={!!errors.ctc} style={styles.errorText}>
                      {errors.ctc.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="min_cgpa"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Minimum CGPA Required</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value === 0 ? '' : value.toString()}
                    error={!!errors.min_cgpa}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.min_cgpa && (
                    <HelperText type="error" visible={!!errors.min_cgpa} style={styles.errorText}>
                      {errors.min_cgpa.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="deadline"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Application Deadline (YYYY-MM-DD)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="2026-12-31"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.deadline}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.deadline && (
                    <HelperText type="error" visible={!!errors.deadline} style={styles.errorText}>
                      {errors.deadline.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Backlogs Allowed</Text>
              <Controller
                control={control}
                name="backlog_allowed"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    color={Theme.colors.primary}
                  />
                )}
              />
            </View>

            <View style={styles.checkboxSection}>
              <Text style={styles.checkboxSectionTitle}>
                Eligible Branches
              </Text>
              <Controller
                control={control}
                name="eligible_branches"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.checkboxGrid}>
                    {BRANCHES.map((branch) => {
                      const isChecked = value.includes(branch);
                      return (
                        <Checkbox.Item
                          key={branch}
                          label={branch}
                          status={isChecked ? 'checked' : 'unchecked'}
                          color={Theme.colors.primary}
                          onPress={() => {
                            if (isChecked) {
                              onChange(value.filter((b) => b !== branch));
                            } else {
                              onChange([...value, branch]);
                            }
                          }}
                          style={styles.checkboxItem}
                          labelStyle={styles.checkboxLabel}
                        />
                      );
                    })}
                  </View>
                )}
              />
              {errors.eligible_branches && (
                <HelperText type="error" visible={!!errors.eligible_branches} style={styles.errorText}>
                  {errors.eligible_branches.message}
                </HelperText>
              )}
            </View>

            <View style={styles.checkboxSection}>
              <Text style={styles.checkboxSectionTitle}>
                Interview Rounds
              </Text>
              <View style={styles.stepperRow}>
                <Text style={styles.switchLabel}>How many rounds?</Text>
                <View style={styles.stepper}>
                  <Button mode="outlined" compact onPress={() => setRounds((watchedRounds || 1) - 1)} style={styles.stepBtn}>
                    −
                  </Button>
                  <Text style={styles.stepValue}>{watchedRounds}</Text>
                  <Button mode="outlined" compact onPress={() => setRounds((watchedRounds || 1) + 1)} style={styles.stepBtn}>
                    +
                  </Button>
                </View>
              </View>
              <Controller
                control={control}
                name="round_names"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.roundList}>
                    {(value ?? []).slice(0, watchedRounds || 1).map((name, i) => (
                      <View key={i} style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Round {i + 1} name</Text>
                        <TextInput
                          mode="outlined"
                          placeholder={['Aptitude Test', 'Technical Interview', 'HR Round'][i] ?? `Round ${i + 1}`}
                          onChangeText={(t) => {
                            const next = [...(value ?? [])];
                            next[i] = t;
                            onChange(next);
                          }}
                          value={name}
                          error={!!errors.round_names}
                          style={styles.input}
                          outlineColor={Theme.colors.border}
                          activeOutlineColor={Theme.colors.primary}
                          outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                        />
                        <Text style={[styles.inputLabel, { marginTop: 6 }]}>Round {i + 1} date (YYYY-MM-DD, optional)</Text>
                        <TextInput
                          mode="outlined"
                          placeholder="2026-09-16"
                          onChangeText={(t) => setRoundDate(i, t)}
                          value={(watchedDates ?? [])[i] ?? ''}
                          style={styles.input}
                          outlineColor={Theme.colors.border}
                          activeOutlineColor={Theme.colors.primary}
                          outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                        />
                      </View>
                    ))}
                  </View>
                )}
              />
              {(errors.round_names as any) && (
                <HelperText type="error" visible={!!errors.round_names} style={styles.errorText}>
                  {(errors.round_names as any).message}
                </HelperText>
              )}
              {errors.total_rounds && (
                <HelperText type="error" visible={!!errors.total_rounds} style={styles.errorText}>
                  {errors.total_rounds.message}
                </HelperText>
              )}
            </View>

            <View style={styles.checkboxSection}>
              <Text style={styles.checkboxSectionTitle}>
                Job Profiles Offered
              </Text>
              <Controller
                control={control}
                name="job_profiles"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.roundList}>
                    {(value ?? []).map((role, i) => (
                      <View key={i} style={styles.profileRow}>
                        <TextInput
                          mode="outlined"
                          placeholder={['Software Developer', 'Quality Engineer'][i] ?? `Role ${i + 1}`}
                          onChangeText={(t) => {
                            const next = [...(value ?? [])];
                            next[i] = t;
                            onChange(next);
                          }}
                          value={role}
                          error={!!errors.job_profiles}
                          style={[styles.input, styles.profileInput]}
                          outlineColor={Theme.colors.border}
                          activeOutlineColor={Theme.colors.primary}
                          outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                        />
                        {(value ?? []).length > 1 ? (
                          <Button mode="outlined" compact onPress={() => onChange((value ?? []).filter((_, j) => j !== i))} style={styles.stepBtn}>
                            ✕
                          </Button>
                        ) : null}
                      </View>
                    ))}
                    <Button mode="outlined" icon="plus" onPress={() => onChange([...(value ?? []), ''])} style={styles.addRoleBtn}>
                      Add Role
                    </Button>
                  </View>
                )}
              />
              {(errors.job_profiles as any) && (
                <HelperText type="error" visible={!!errors.job_profiles} style={styles.errorText}>
                  {(errors.job_profiles as any).message}
                </HelperText>
              )}
            </View>

            <Controller
              control={control}
              name="stipend"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Monthly Stipend (if internship, optional)</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    placeholder="e.g. 25000"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.stipend}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.stipend && (
                    <HelperText type="error" visible={!!errors.stipend} style={styles.errorText}>
                      {errors.stipend.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="bond_years"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Service Bond (years, optional)</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    placeholder="e.g. 2"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.bond_years}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.bond_years && (
                    <HelperText type="error" visible={!!errors.bond_years} style={styles.errorText}>
                      {errors.bond_years.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Job Location</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g. Bengaluru"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.location}
                    style={styles.input}
                    outlineColor={Theme.colors.border}
                    activeOutlineColor={Theme.colors.primary}
                    outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                  />
                  {errors.location && (
                    <HelperText type="error" visible={!!errors.location} style={styles.errorText}>
                      {errors.location.message}
                    </HelperText>
                  )}
                </View>
              )}
            />

            <Button
              mode="contained"
              loading={loading || isSubmitting}
              disabled={loading || isSubmitting}
              onPress={handleSubmit(onSubmit)}
              style={styles.button}
              buttonColor={Theme.colors.primary}
              textColor="#FFFFFF"
            >
              Publish Job Posting
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    padding: Theme.spacing.lg,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardContent: {
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: Theme.typography.sizes.caption,
    fontWeight: Theme.typography.weights.medium as any,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Theme.colors.background,
    fontSize: Theme.typography.sizes.body,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: Theme.typography.sizes.caption,
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  switchLabel: {
    fontSize: Theme.typography.sizes.body,
    color: Theme.colors.textPrimary,
  },
  checkboxSection: {
    marginTop: Theme.spacing.sm,
    gap: 4,
  },
  checkboxSectionTitle: {
    fontWeight: Theme.typography.weights.bold as any,
    fontSize: Theme.typography.sizes.cardTitle,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkboxItem: {
    width: '50%',
    paddingVertical: 2,
  },
  checkboxLabel: {
    fontSize: Theme.typography.sizes.body,
    color: Theme.colors.textPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    borderRadius: Theme.borderRadius.button,
    minWidth: 40,
  },
  stepValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.primaryText,
    minWidth: 28,
    textAlign: 'center',
  },
  roundList: {
    gap: 4,
    marginTop: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileInput: {
    flex: 1,
  },
  addRoleBtn: {
    borderRadius: Theme.borderRadius.button,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  button: {
    marginTop: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.button,
  },
});
