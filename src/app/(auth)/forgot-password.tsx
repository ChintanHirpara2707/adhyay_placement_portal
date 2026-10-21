import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { C } from '@/theme/design';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Field, authInputProps, AuthPrimaryButton, authCardStyles } from '@/components/ui/AuthField';
import { ToastType } from '@/components/AnimatedToast';

const forgotSchema = z.object({
  email: z.string().trim().email({ message: 'Enter a valid email address' }),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

const forgotResolver = (data: ForgotFormData) => {
  const result = forgotSchema.safeParse(data);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  result.error.issues.forEach((err) => {
    errors[String(err.path[0])] = { type: err.code, message: err.message };
  });
  return { values: {}, errors };
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotFormData>({
    resolver: forgotResolver,
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onInvalid = (formErrors: Record<string, any>) => {
    const first = Object.values(formErrors)[0] as any;
    const msg = first?.message || 'Please fix the highlighted fields and try again.';
    console.warn('[forgot] validation blocked submit:', JSON.stringify(formErrors));
    setSubmitError(msg);
  };

  const onSubmit = async (data: ForgotFormData) => {
    if (isSubmitting || cooldown > 0) return;
    setSubmitError(null);
    setIsSubmitting(true);
    setLoading(true);
    try {
      const email = data.email.trim().toLowerCase();
      console.log('[forgot] sending OTP to:', email);
      // No redirectTo: we want an OTP code, not a magic link.
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.warn('[forgot] resetPasswordForEmail failed:', error.message);
        setSubmitError(error.message);
        if (/rate|limit|too many|try again|after a while/i.test(error.message)) {
          setCooldown(60);
        }
        return;
      }
      console.log('[forgot] OTP request accepted for:', email);
      setToast({ visible: true, message: 'OTP sent to your email.', type: 'success' });
      // Navigate immediately — do not gate the transition on an alert
      // dismissal (alerts behave inconsistently across web/native).
      router.push({ pathname: '/(auth)/verify-otp' as any, params: { email, sent: '1' } });
    } catch (e: any) {
      console.warn('[forgot] unexpected error:', e?.message);
      setSubmitError(e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your account email and we'll send you an OTP code."
      toast={toast}
      onDismissToast={() => setToast((prev) => ({ ...prev, visible: false }))}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field label="Email Address" error={errors.email?.message}>
            <TextInput
              {...authInputProps}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@example.com"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit, onInvalid)}
              left={<TextInput.Icon icon="email-outline" color={C.faint} />}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.email}
              style={authCardStyles.input}
            />
          </Field>
        )}
      />

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      <AuthPrimaryButton
        title={cooldown > 0 ? `Wait ${cooldown}s` : 'Send OTP'}
        loading={loading || isSubmitting}
        disabled={loading || isSubmitting || cooldown > 0}
        onPress={handleSubmit(onSubmit, onInvalid)}
      />

      <View style={styles.footer}>
        <Link href="/(auth)/login" style={styles.link}>
          Back to Login
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  submitError: { color: C.danger, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  footer: { marginTop: 20, alignItems: 'center' },
  link: { color: C.accent, fontWeight: '700', fontSize: 14 },
});
