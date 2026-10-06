import { AnimatedPressable } from "@/components/AnimatedPressable";
import { WebOnlyDecorations } from "@/components/WebOnlyDecorations";
import { supabase } from "@/lib/supabase";
import { Theme } from "@/theme/theme";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import { z } from "zod";

const verifySchema = z
  .object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{4,10}$/, {
        message: "Enter the 4–10 digit code from your email",
      }),
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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
  const { email, sent } = useLocalSearchParams<{
    email: string;
    sent?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [secureEntry, setSecureEntry] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: verifyResolver,
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onInvalid = (formErrors: Record<string, any>) => {
    const first = Object.values(formErrors)[0] as any;
    const msg =
      first?.message || "Please fix the highlighted fields and try again.";
    console.warn(
      "[reset] validation blocked submit:",
      JSON.stringify(formErrors),
    );
    setSubmitError(msg);
    Alert.alert("Check form", msg);
  };

  useEffect(() => {
    console.log(
      "[reset] verify screen mounted, email param:",
      JSON.stringify(email ?? null),
    );
    if (!email) {
      setSubmitError("No email was provided. Go back and request a new OTP.");
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = async (data: VerifyFormData) => {
    if (isSubmitting) return;
    setSubmitError(null);
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    console.log(
      "[reset] submit attempt for:",
      normalizedEmail,
      "| otp length:",
      data.otp.trim().length,
    );
    if (!normalizedEmail) {
      const msg = "No email was provided. Go back and request a new OTP.";
      setSubmitError(msg);
      Alert.alert("Missing email", msg);
      return;
    }
    setIsSubmitting(true);
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: data.otp.trim(),
        type: "recovery",
      });
      if (verifyError) {
        console.warn("[reset] verifyOtp failed:", verifyError.message);
        setSubmitError(verifyError.message);
        Alert.alert("OTP verification failed", verifyError.message);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (updateError) {
        console.warn("[reset] updateUser failed:", updateError.message);
        setSubmitError(updateError.message);
        Alert.alert("Password update failed", updateError.message);
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      router.replace({
        pathname: "/(auth)/login",
        params: { reset: "1" },
      } as any);
    } catch (e: any) {
      console.warn("[reset] unexpected error:", e?.message);
      setSubmitError(e.message || "Something went wrong.");
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        String(email ?? "")
          .trim()
          .toLowerCase(),
      );
      if (error) {
        Alert.alert("Could not resend OTP", error.message);
        return;
      }
      setCooldown(RESEND_SECONDS);
      Alert.alert("OTP resent", "A new code was sent to your email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <WebOnlyDecorations />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <MotiView
          from={{ opacity: 0, scale: 0.96, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={styles.cardWrapper}
        >
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.title}>
                  Verify OTP
                </Text>
                {sent === "1" ? (
                  <View style={styles.sentBanner}>
                    <Text style={styles.sentText}>OTP sent to your email.</Text>
                  </View>
                ) : null}
                <Text variant="bodyMedium" style={styles.subtitle}>
                  Enter the code sent to {email ? String(email) : "your email"}.
                </Text>
              </View>

              <Controller
                control={control}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      mode="outlined"
                      label="OTP Code"
                      left={
                        <TextInput.Icon
                          icon="numeric"
                          color={Theme.colors.secondaryText}
                        />
                      }
                      keyboardType="numeric"
                      maxLength={10}
                      autoCapitalize="none"
                      placeholder="123456"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      onBlur={onBlur}
                      onChangeText={(t) =>
                        onChange(t.replace(/[^0-9]/g, "").slice(0, 10))
                      }
                      value={value}
                      error={!!errors.otp}
                      style={styles.textInput}
                    />
                    {errors.otp && (
                      <HelperText
                        type="error"
                        visible={!!errors.otp}
                        style={styles.errorText}
                      >
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
                    <TextInput
                      mode="outlined"
                      label="New Password"
                      left={
                        <TextInput.Icon
                          icon="lock-outline"
                          color={Theme.colors.secondaryText}
                        />
                      }
                      secureTextEntry={secureEntry}
                      autoCapitalize="none"
                      placeholder="At least 6 characters"
                      outlineColor={Theme.colors.border}
                      activeOutlineColor={Theme.colors.primaryAccent}
                      outlineStyle={{ borderRadius: Theme.borderRadius.input }}
                      right={
                        <TextInput.Icon
                          icon={secureEntry ? "eye" : "eye-off"}
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
                      <HelperText
                        type="error"
                        visible={!!errors.newPassword}
                        style={styles.errorText}
                      >
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
                    <TextInput
                      mode="outlined"
                      label="Confirm Password"
                      left={
                        <TextInput.Icon
                          icon="lock-check-outline"
                          color={Theme.colors.secondaryText}
                        />
                      }
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
                      <HelperText
                        type="error"
                        visible={!!errors.confirmPassword}
                        style={styles.errorText}
                      >
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
                  loading={loading || isSubmitting}
                  disabled={loading || isSubmitting}
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
                  <Text style={styles.cooldownText}>
                    Resend OTP in {cooldown}s
                  </Text>
                ) : (
                  <Text style={styles.footerText}>
                    Didn't get the code?{" "}
                    <Text style={styles.linkText} onPress={handleResend}>
                      {resending ? "Sending…" : "Resend OTP"}
                    </Text>
                  </Text>
                )}
                <Link
                  href="/(auth)/login"
                  style={[styles.linkText, styles.backLink]}
                >
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
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justify: "center",
    padding: Theme.spacing.lg,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
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
    marginBottom: Theme.spacing.lg,
    alignItems: "center",
  },
  sentBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  sentText: {
    color: Theme.colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
  title: {
    fontWeight: "700",
    color: Theme.colors.primaryText,
    marginBottom: Theme.spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    color: Theme.colors.secondaryText,
    textAlign: "center",
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: Theme.spacing.sm,
  },
  textInput: {
    backgroundColor: Theme.colors.surface,
    fontSize: 14,
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 2,
  },
  submitError: {
    paddingHorizontal: 0,
    marginTop: 2,
    marginBottom: 8,
    textAlign: "center",
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
    marginTop: Theme.spacing.lg,
    alignItems: "center",
    gap: 10,
  },
  footerText: {
    ...Theme.typography.body,
    color: Theme.colors.secondaryText,
  },
  cooldownText: {
    ...Theme.typography.body,
    color: Theme.colors.secondaryText,
  },
  linkText: {
    color: Theme.colors.primaryAccent,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 2,
  },
});
