import { AnimatedPressable } from "@/components/AnimatedPressable";
import { WebOnlyDecorations } from "@/components/WebOnlyDecorations";
import { supabase } from "@/lib/supabase";
import { Theme } from "@/theme/theme";
import { Link, useRouter } from "expo-router";
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

const forgotSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }),
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

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: forgotResolver,
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onInvalid = (formErrors: Record<string, any>) => {
    const first = Object.values(formErrors)[0] as any;
    const msg =
      first?.message || "Please fix the highlighted fields and try again.";
    console.warn(
      "[forgot] validation blocked submit:",
      JSON.stringify(formErrors),
    );
    setSubmitError(msg);
    Alert.alert("Check form", msg);
  };

  const onSubmit = async (data: ForgotFormData) => {
    if (isSubmitting || cooldown > 0) return;
    setSubmitError(null);
    setIsSubmitting(true);
    setLoading(true);
    try {
      const email = data.email.trim().toLowerCase();
      console.log("[forgot] sending OTP to:", email);
      // No redirectTo: we want an OTP code, not a magic link.
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.warn("[forgot] resetPasswordForEmail failed:", error.message);
        setSubmitError(error.message);
        Alert.alert("Could not send OTP", error.message);
        if (
          /rate|limit|too many|try again|after a while/i.test(error.message)
        ) {
          setCooldown(60);
        }
        return;
      }
      console.log("[forgot] OTP request accepted for:", email);
      // Navigate immediately — do not gate the transition on an alert
      // dismissal (alerts behave inconsistently across web/native).
      router.push({
        pathname: "/(auth)/verify-otp" as any,
        params: { email, sent: "1" },
      });
    } catch (e: any) {
      console.warn("[forgot] unexpected error:", e?.message);
      setSubmitError(e.message || "Something went wrong.");
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
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
                  Forgot Password
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                  Enter your account email and we'll send you an OTP code.
                </Text>
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      mode="outlined"
                      label="Email Address"
                      left={
                        <TextInput.Icon
                          icon="email-outline"
                          color={Theme.colors.secondaryText}
                        />
                      }
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
                      <HelperText
                        type="error"
                        visible={!!errors.email}
                        style={styles.errorText}
                      >
                        {errors.email.message}
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
                  disabled={loading || isSubmitting || cooldown > 0}
                  onPress={handleSubmit(onSubmit, onInvalid)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={Theme.colors.primaryAccent}
                  textColor="#FFFFFF"
                >
                  {cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
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
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
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
  },
  linkText: {
    color: Theme.colors.primaryAccent,
    fontWeight: "600",
  },
});
