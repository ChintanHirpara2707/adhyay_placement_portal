import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Theme } from '@/theme/theme';
import { AnimatedToast, ToastType } from '@/components/AnimatedToast';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

const loginResolver = (data: LoginFormData) => {
  const result = loginSchema.safeParse(data);
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

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const { setSession, setRole } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: loginResolver,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  // Arriving fresh from a successful password reset.
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  React.useEffect(() => {
    if (reset === '1') {
      showToast('Password reset successful. Sign in with your new password.', 'success');
      router.setParams({ reset: undefined } as any);
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        showToast(authError.message, 'error');
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const loginId = authData.user.id;
        console.log('[login] signed in user id:', loginId);
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('role')
          .eq('id', loginId)
          .maybeSingle();

        if (dbError) {
          showToast('Could not fetch user role profile: ' + dbError.message, 'error');
          setLoading(false);
          return;
        }

        let userRole = dbUser?.role as string | null | undefined;

        // Self-repair: signup with email confirmation may not have written rows yet.
        if (!userRole) {
          const metaRole = (authData.user.user_metadata as any)?.role;
          console.log('[login] no users row; metadata role:', metaRole);
          if (metaRole === 'student' || metaRole === 'company') {
            const { error: repairUserError } = await supabase
              .from('users')
              .upsert({ id: loginId, email: authData.user.email ?? data.email.trim(), role: metaRole });
            if (!repairUserError) {
              if (metaRole === 'student') {
                await supabase.from('students').upsert({ id: loginId });
              } else {
                await supabase
                  .from('companies')
                  .upsert({ id: loginId, approved: false, company_name: (authData.user.email ?? data.email).split('@')[0] });
              }
              userRole = metaRole;
              console.log('[login] repaired missing users row as', metaRole);
            } else {
              console.warn('[login] repair failed:', repairUserError.message);
            }
          }
        }

        console.log('[login] fetched role value:', userRole, 'for user:', loginId);

        if (userRole !== 'student' && userRole !== 'company' && userRole !== 'admin') {
          await supabase.auth.signOut().catch(() => {});
          showToast('No role found for this account. Please sign up again or contact the placement cell.', 'error');
          setLoading(false);
          return;
        }

        setSession(authData.session);
        setRole(userRole);

        showToast('Login successful! Redirecting...', 'success');

        if (userRole === 'admin') {
          router.replace('/(admin)/dashboard');
        } else if (userRole === 'company') {
          router.replace('/(company)/dashboard');
        } else {
          router.replace('/(student)/dashboard');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'An unexpected error occurred.', 'error');
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
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to access your placement portal</Text>
              </View>

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
                      placeholder="e.g. john@university.edu"
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
                      placeholder="Enter your password"
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

              <View style={styles.forgotRow}>
                <Link href="/(auth)/forgot-password" style={styles.linkText}>
                  Forgot Password?
                </Link>
              </View>

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
                  Sign In
                </Button>
              </AnimatedPressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don't have an account?{' '}
                  <Link href="/(auth)/signup" style={styles.linkText}>
                    Sign Up
                  </Link>
                </Text>
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
  buttonWrapper: {
    marginTop: Theme.spacing.md,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 4,
  },
  button: {
    borderRadius: Theme.borderRadius.button,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    marginTop: Theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Theme.typography.body,
    color: Theme.colors.secondaryText,
  },
  linkText: {
    color: Theme.colors.primaryAccent,
    fontWeight: '600',
  },
});
