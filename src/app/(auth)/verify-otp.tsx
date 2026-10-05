import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

const verifySchema = z
  .object({
    otp: z.string().trim().regex(/^\d{6}$/, { message: 'Enter the 6-digit code' }),
    newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type VerifyFormData = z.infer<typeof verifySchema>;

const verifyResolver = (data: VerifyFormData) => {
  const result = verifySchema.safeParse(data);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  result.error.issues.forEach((err) => {
    errors[String(err.path[0])] = { type: err.code, message: err.message };
  });
  return { values: {}, errors };
};

const RESEND_SECONDS = 60;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email, sent } = useLocalSearchParams<{ email: string; sent?: string }>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [secureEntry, setSecureEntry] = useState(true);

  const { control, handleSubmit, formState: { errors } } = useForm<VerifyFormData>({
    resolver: verifyResolver,
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onInvalid = (formErrors: Record<string, any>) => {
    const first = Object.values(formErrors)[0] as any;
    const msg = first?.message || 'Please fix the highlighted fields and try again.';
    console.warn('[reset] validation blocked submit:', JSON.stringify(formErrors));
    setSubmitError(msg);
    Alert.alert('Check form', msg);
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = async (data: VerifyFormData) => {
    setSubmitError(null);
    console.log('[reset] submit attempt for:', String(email), '| otp length:', data.otp.trim().length);
    if (!email) {
      const msg = 'No email was provided. Go back and request a new OTP.';
      setSubmitError(msg);
      Alert.alert('Missing email', msg);
      return;
    }
    setLoading(true);
    try {
      // Step 1: verify OTP → establishes a temporary recovery session.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: String(email),
        token: data.otp.trim(),
        type: 'recovery',
      });
      if (verifyError) {
        console.warn('[reset] verifyOtp failed:', verifyError.message);
        setSubmitError(verifyError.message);
        Alert.alert('OTP verification failed', verifyError.message);
        return;
      }
      // Step 2: set the new password on the recovery session.
      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword });
      if (updateError) {
        console.warn('[reset] updateUser failed:', updateError.message);
        setSubmitError(updateError.message);
        Alert.alert('Password update failed', updateError.message);
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      // Navigate immediately — alert-gated navigation is unreliable on web.
      router.replace({ pathname: '/(auth)/login', params: { reset: '1' } } as any);
    } catch (e: any) {
      console.warn('[reset] unexpected error:', e?.message);
      setSubmitError(e.message || 'Something went wrong.');
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email));
      if (error) {
        Alert.alert('Could not resend OTP', error.message);
        return;
      }
      setCooldown(RESEND_SECONDS);
      Alert.alert('OTP resent', 'A new code was sent to your email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <WebOnlyDecorations />
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
                <Text style={styles.title}>Verify OTP</Text>
                {sent === '1' ? (
                  <View style={styles.sentBanner}>
                    <Text style={styles.sentText}>OTP sent to your email.</Text>
                  </View>
                ) : null}
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to {email ? String(email) : 'your email'}.
                </Text>
              </View>

              <Controller
                control={control}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>OTP Code</Text>
                    <TextInput
                      mode="outlined"
                      keyboardType="numeric"
                      maxLength={6}
                      autoCapitalize="none"
                      placeholder="123456"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      onBlur={onBlur}
                      onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      value={value}
                      error={!!errors.otp}
                      style={[styles.textInput, styles.otpInput]}
                    />
                    {errors.otp && (
                      <HelperText type="error" visible={!!errors.otp} style={styles.errorText}>
                        {errors.otp.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      mode="outlined"
                      secureTextEntry={secureEntry}
                      autoCapitalize="none"
                      placeholder="At least 6 characters"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      right={
                        <TextInput.Icon
                          icon={secureEntry ? 'eye' : 'eye-off'}
                          onPress={() => setSecureEntry(!secureEntry)}
                          color={Theme.colors.secondaryText}
                        />
                      }
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.newPassword}
                      style={styles.textInput}
                    />
                    {errors.newPassword && (
                      <HelperText type="error" visible={!!errors.newPassword} style={styles.errorText}>
                        {errors.newPassword.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      mode="outlined"
                      secureTextEntry={secureEntry}
                      autoCapitalize="none"
                      placeholder="Repeat new password"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.confirmPassword}
                      style={styles.textInput}
                    />
                    {errors.confirmPassword && (
                      <HelperText type="error" visible={!!errors.confirmPassword} style={styles.errorText}>
                        {errors.confirmPassword.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              {submitError ? (
                <HelperText type="error" visible style={styles.submitError}>
                  {submitError}
                </HelperText>
              ) : null}

              <AnimatedPressable scaleTo={0.98} style={styles.buttonWrapper}>
                <Button
                  mode="contained"
                  loading={loading}
                  disabled={loading}
                  onPress={handleSubmit(onSubmit, onInvalid)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={Theme.colors.primaryAccent}
                  textColor="#FFFFFF"
                >
                  Reset Password
                </Button>
              </AnimatedPressable>

              <View style={styles.footer}>
                {cooldown > 0 ? (
                  <Text style={styles.cooldownText}>Resend OTP in {cooldown}s</Text>
                ) : (
                  <Text style={styles.footerText}>
                    Didn't get the code?{' '}
                    <Text style={styles.linkText} onPress={handleResend}>
                      {resending ? 'Sending…' : 'Resend OTP'}
                    </Text>
                  </Text>
                )}
                <Link href="/(auth)/login" style={[styles.linkText, styles.backLink]}>
                  Back to Login
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
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: Theme.spacing.lg },
  cardWrapper: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.borderRadius.card, borderWidth: 1, borderColor: Theme.colors.border },
  cardContent: { padding: Theme.spacing.xl },
  header: { marginBottom: Theme.spacing.xl, alignItems: 'center' },
  sentBanner: { backgroundColor: '#D1FAE5', borderRadius: Theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  sentText: { color: Theme.colors.success, fontWeight: '600', fontSize: 13 },
  title: { ...Theme.typography.screenTitle, color: Theme.colors.primaryText, marginBottom: Theme.spacing.xs, textAlign: 'center' },
  subtitle: { ...Theme.typography.body, color: Theme.colors.secondaryText, textAlign: 'center' },
  inputContainer: { marginBottom: Theme.spacing.md },
  inputLabel: { ...Theme.typography.caption, fontWeight: '600', color: Theme.colors.primaryText, marginBottom: 6 },
  textInput: { backgroundColor: Theme.colors.surface, fontSize: 14 },
  otpInput: { letterSpacing: 8, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorText: { paddingHorizontal: 0, marginTop: 2 },
  submitError: { paddingHorizontal: 0, marginTop: 2, marginBottom: 4, textAlign: 'center' },
  buttonWrapper: { marginTop: Theme.spacing.md },
  button: { borderRadius: Theme.borderRadius.button },
  buttonContent: { paddingVertical: 6 },
  footer: { marginTop: Theme.spacing.xl, alignItems: 'center', gap: 8 },
  footerText: { ...Theme.typography.body, color: Theme.colors.secondaryText },
  cooldownText: { ...Theme.typography.body, color: Theme.colors.secondaryText },
  linkText: { color: Theme.colors.primaryAccent, fontWeight: '600' },
  backLink: { marginTop: 4 },
});
