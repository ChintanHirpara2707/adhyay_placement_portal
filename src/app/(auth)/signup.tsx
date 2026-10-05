import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { AnimatedToast, ToastType } from '@/components/AnimatedToast';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['student', 'company']),
});

type SignupFormData = z.infer<typeof signupSchema>;

const signupResolver = (data: SignupFormData) => {
  const result = signupSchema.safeParse(data);
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

export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: signupResolver,
    defaultValues: {
      email: '',
      password: '',
      role: 'student',
    },
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      console.log('[signup] selected role:', data.role);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
          },
        },
      });

      if (authError) {
        showToast(authError.message, 'error');
        setLoading(false);
        return;
      }

      const newUser = authData.user ?? authData.session?.user;
      if (!newUser) {
        showToast('Registration failed: User could not be created.', 'error');
        setLoading(false);
        return;
      }

      const userId = newUser.id;
      const hasSession = !!authData.session;
      console.log('[signup] user id:', userId, '| active session:', hasSession, '| role to write:', data.role);

      // 1. Write the role to the users table FIRST (login redirect depends on this row).
      const { error: userRowError } = await supabase
        .from('users')
        .upsert({ id: userId, email: data.email.trim(), role: data.role });

      if (userRowError) {
        console.warn('[signup] users upsert failed:', userRowError.message);
        showToast(
          hasSession
            ? 'Account created but role could not be saved: ' + userRowError.message
            : 'Account created. Confirm your email, then sign in — your profile will finish setting up on first login.',
          hasSession ? 'error' : 'info'
        );
        if (!hasSession) {
          await supabase.auth.signOut().catch(() => {});
          setTimeout(() => router.replace('/(auth)/login'), 1200);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      // 2. Create the role row using the SAME selected role value.
      if (data.role === 'student') {
        const { error: studentError } = await supabase.from('students').upsert({ id: userId });
        if (studentError) {
          console.warn('[signup] students upsert:', studentError.message);
          showToast('Account created but student profile failed: ' + studentError.message, 'error');
          setLoading(false);
          return;
        }
      } else if (data.role === 'company') {
        const companyName = data.email.split('@')[0];
        const { error: companyError } = await supabase
          .from('companies')
          .upsert({ id: userId, approved: false, company_name: companyName });
        if (companyError) {
          console.warn('[signup] companies upsert:', companyError.message);
          showToast('Account created but company profile failed: ' + companyError.message, 'error');
          setLoading(false);
          return;
        }
      }

      console.log('[signup] role write complete for', userId, 'as', data.role);
      // Clear any auto session so login re-fetches a fresh role.
      await supabase.auth.signOut().catch(() => {});
      showToast('Registration successful! Please sign in.', 'success');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1200);
    } catch (e: any) {
      showToast(e.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <WebOnlyDecorations />
      <AnimatedToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <MotiView
          from={{ opacity: 0, scale: 0.95, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320 }}
          style={styles.cardWrapper}
        >
          <Card style={styles.card} elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join the University Placement Portal</Text>
              </View>

              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>I am registering as</Text>
                    <SegmentedButtons
                      value={value}
                      onValueChange={onChange}
                      buttons={[
                        {
                          value: 'student',
                          label: 'Student',
                          checkedColor: '#FFFFFF',
                          style: value === 'student' ? styles.segmentedActive : styles.segmentedInactive,
                        },
                        {
                          value: 'company',
                          label: 'Company',
                          checkedColor: '#FFFFFF',
                          style: value === 'company' ? styles.segmentedActive : styles.segmentedInactive,
                        },
                      ]}
                      style={styles.segmentedButtons}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="name@example.com"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.email}
                      style={styles.textInput}
                    />
                    {errors.email && (
                      <HelperText type="error" visible={!!errors.email} style={styles.errorText}>
                        {errors.email.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      mode="outlined"
                      secureTextEntry={secureTextEntry}
                      autoCapitalize="none"
                      placeholder="At least 6 characters"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      right={
                        <TextInput.Icon
                          icon={secureTextEntry ? 'eye' : 'eye-off'}
                          onPress={() => setSecureTextEntry(!secureTextEntry)}
                          color={Theme.colors.secondaryText}
                        />
                      }
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.password}
                      style={styles.textInput}
                    />
                    {errors.password && (
                      <HelperText type="error" visible={!!errors.password} style={styles.errorText}>
                        {errors.password.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <AnimatedPressable scaleTo={0.98} style={styles.buttonWrapper}>
                <Button
                  mode="contained"
                  loading={loading}
                  disabled={loading}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={Theme.colors.primaryAccent}
                  textColor="#FFFFFF"
                >
                  Sign Up
                </Button>
              </AnimatedPressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href={'/(auth)/login' as any} asChild>
                  <Text style={styles.logInLink}>Log In</Text>
                </Link>
              </View>
            </Card.Content>
          </Card>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardContent: {
    padding: Theme.spacing.xl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...Theme.typography.screenTitle,
    color: Theme.colors.primaryText,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.secondaryText,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.primaryText,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Theme.colors.surface,
    fontSize: 14,
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 2,
  },
  segmentedButtons: {
    marginBottom: Theme.spacing.xs,
  },
  segmentedActive: {
    backgroundColor: Theme.colors.primaryAccent,
  },
  segmentedInactive: {
    backgroundColor: Theme.colors.surface,
  },
  buttonWrapper: {
    marginTop: Theme.spacing.md,
  },
  button: {
    borderRadius: Theme.borderRadius.button,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    marginTop: Theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...Theme.typography.body,
    color: Theme.colors.secondaryText,
  },
  logInLink: {
    ...Theme.typography.body,
    color: Theme.colors.primaryAccent,
    fontWeight: '600',
  },
});
