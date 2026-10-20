import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Field, authInputProps, AuthPrimaryButton, authCardStyles } from '@/components/ui/AuthField';
import { ToastType } from '@/components/AnimatedToast';

const verifySchema = z
  .object({
    otp: z.string().trim().regex(/^\d{4,10}$/, { message: 'Enter the 4–10 digit code from your email' }),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [secureEntry, setSecureEntry] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const { control, handleSubmit, formState: { errors } } = useForm<VerifyFormData>({
    resolver: verifyResolver,
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    console.log('[reset] verify screen mounted, email param:', JSON.stringify(email ?? null));
    if (!email) {
      setSubmitError('No email was provided. Go back and request a new OTP.');
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fail = (msg: string) => {
    setSubmitError(msg);
    setToast({ visible: true, message: msg, type: 'error' });
  };

  const onInvalid = (formErrors: Record<string, any>) => {
    const first = Object.values(formErrors)[0] as any;
    const msg = first?.message || 'Please fix the highlighted fields and try again.';
    console.warn('[reset] validation blocked submit:', JSON.stringify(formErrors));
    fail(msg);
  };

  const onSubmit = async (data: VerifyFormData) => {
    if (isSubmitting) return;
    setSubmitError(null);
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    console.log('[reset] submit attempt for:', normalizedEmail, '| otp length:', data.otp.trim().length);
    if (!normalizedEmail) {
      fail('No email was provided. Go back and request a new OTP.');
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      // Step 1: verify OTP → establishes a temporary recovery session.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: data.otp.trim(),
        type: 'recovery',
      });
      if (verifyError) {
        console.warn('[reset] verifyOtp failed:', verifyError.message);
        fail(verifyError.message);
        return;
      }
      // Step 2: set the new password on the recovery session.
      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword });
      if (updateError) {
        console.warn('[reset] updateUser failed:', updateError.message);
        fail(updateError.message);
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      // Navigate immediately — alert-gated navigation is unreliable on web.
      router.replace({ pathname: '/(auth)/login', params: { reset: '1' } } as any);
    } catch (e: any) {
      console.warn('[reset] unexpected error:', e?.message);
      fail(e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email ?? '').trim().toLowerCase());
      if (error) {
        fail(error.message);
        return;
      }
      setCooldown(RESEND_SECONDS);
      setToast({ visible: true, message: 'A new code was sent to your email.', type: 'success' });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle={`Enter the code sent to ${email ? String(email) : 'your email'}.`}
      toast={toast}
      onDismissToast={() => setToast((prev) => ({ ...prev, visible: false }))}
    >
      {sent === '1' ? (
        <View style={styles.sentBanner}>
          <Text style={styles.sentText}>OTP sent to your email.</Text>
        </View>
      ) : null}

      <Controller
        control={control}
        name="otp"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field label="OTP Code" error={errors.otp?.message}>
            <TextInput
              {...authInputProps}
              keyboardType="numeric"
              maxLength={10}
              autoCapitalize="none"
              placeholder="12345678"
              left={<TextInput.Icon icon="shield-key-outline" color={C.faint} />}
              onBlur={onBlur}
              onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 10))}
              value={value}
              error={!!errors.otp}
              style={[authCardStyles.input, styles.otpInput]}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field label="New Password" error={errors.newPassword?.message}>
            <TextInput
              {...authInputProps}
              secureTextEntry={secureEntry}
              autoCapitalize="none"
              placeholder="At least 6 characters"
              left={<TextInput.Icon icon="lock-outline" color={C.faint} />}
              right={
                <TextInput.Icon
                  icon={secureEntry ? 'eye' : 'eye-off'}
                  onPress={() => setSecureEntry(!secureEntry)}
                  color={C.muted}
                />
              }
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.newPassword}
              style={authCardStyles.input}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field label="Confirm Password" error={errors.confirmPassword?.message}>
            <TextInput
              {...authInputProps}
              secureTextEntry={secureEntry}
              autoCapitalize="none"
              placeholder="Repeat new password"
              left={<TextInput.Icon icon="lock-check-outline" color={C.faint} />}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.confirmPassword}
              style={authCardStyles.input}
            />
          </Field>
        )}
      />

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      <AuthPrimaryButton
        title="Reset Password"
        loading={loading || isSubmitting}
        disabled={loading || isSubmitting}
        onPress={handleSubmit(onSubmit, onInvalid)}
      />

      <View style={styles.footer}>
        {cooldown > 0 ? (
          <Text style={styles.muted}>Resend OTP in {cooldown}s</Text>
        ) : (
          <Text style={styles.muted}>
            Didn't get the code?{' '}
            <Text style={styles.link} onPress={handleResend}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </Text>
          </Text>
        )}
        <Link href="/(auth)/login" style={styles.link}>
          Back to Login
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  sentBanner: { backgroundColor: C.successSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  sentText: { color: C.success, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  otpInput: { letterSpacing: 6, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  submitError: { color: C.danger, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  footer: { marginTop: 20, alignItems: 'center', gap: 8 },
  muted: { fontSize: 14, color: C.muted },
  link: { color: C.accent, fontWeight: '700', fontSize: 14 },
});
