import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/lib/supabase';
import { Theme } from '@/theme/theme';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WebOnlyDecorations } from '@/components/WebOnlyDecorations';

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

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotFormData>({
    resolver: forgotResolver,
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true);
    try {
      // No redirectTo: we want an OTP code, not a magic link.
      const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim());
      if (error) {
        Alert.alert('Could not send OTP', error.message);
        return;
      }
      // Navigate immediately — do not gate the transition on an alert
      // dismissal (alerts behave inconsistently across web/native).
      router.push({ pathname: '/(auth)/verify-otp' as any, params: { email: data.email.trim(), sent: '1' } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>Enter your account email and we'll send you a 6-digit OTP.</Text>
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
                  Send OTP
                </Button>
              </AnimatedPressable>

              <View style={styles.footer}>
                <Link href="/(auth)/login" style={styles.linkText}>
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
  title: { ...Theme.typography.screenTitle, color: Theme.colors.primaryText, marginBottom: Theme.spacing.xs, textAlign: 'center' },
  subtitle: { ...Theme.typography.body, color: Theme.colors.secondaryText, textAlign: 'center' },
  inputContainer: { marginBottom: Theme.spacing.md },
  inputLabel: { ...Theme.typography.caption, fontWeight: '600', color: Theme.colors.primaryText, marginBottom: 6 },
  textInput: { backgroundColor: Theme.colors.surface, fontSize: 14 },
  errorText: { paddingHorizontal: 0, marginTop: 2 },
  buttonWrapper: { marginTop: Theme.spacing.md },
  button: { borderRadius: Theme.borderRadius.button },
  buttonContent: { paddingVertical: 6 },
  footer: { marginTop: Theme.spacing.xl, alignItems: 'center' },
  linkText: { color: Theme.colors.primaryAccent, fontWeight: '600' },
});
