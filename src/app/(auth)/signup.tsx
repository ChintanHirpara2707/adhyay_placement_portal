import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AnimatedToast, ToastType } from "@/components/AnimatedToast";
import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Link, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Design tokens (matching LoginScreen)                              */
/* ------------------------------------------------------------------ */
const C = {
  ink: "#0B1020",
  inkSoft: "#1F2640",
  paper: "#F7F5F0",
  card: "#FFFFFF",
  line: "#E7E3DA",
  muted: "#5B6272",
  faint: "#9AA0AE",
  accent: "#1F5BFF",
  accentSoft: "#E8EEFF",
  amber: "#F5B544",
};

const LOGO_RATIO = 259 / 217;

const shadow = (y: number, blur: number, opacity: number) =>
  Platform.select({
    ios: {
      shadowColor: "#0B1020",
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation: Math.max(1, Math.round(y / 2)) },
    web: {
      boxShadow: `0px ${y}px ${blur}px rgba(11, 16, 32, ${opacity})`,
    } as any,
    default: {},
  });

const PERKS = [
  {
    icon: "chart-timeline-variant" as const,
    text: "Track every application stage in real time",
  },
  {
    icon: "shield-check-outline" as const,
    text: "Vetted recruiters and verified partners",
  },
  {
    icon: "account-group-outline" as const,
    text: "Dedicated workspaces for students, admins and HR",
  },
];

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */
const signupSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["student", "company"]),
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

/* ------------------------------------------------------------------ */
/* Brand Component                                                   */
/* ------------------------------------------------------------------ */
function Brand({ size, light = false }: { size: number; light?: boolean }) {
  return (
    <View style={styles.brand}>
      <Image
        source={require("../../../assets/images/logo.png")}
        style={{ height: size, width: size * LOGO_RATIO }}
        resizeMode="contain"
      />
      <Text style={[styles.brandText, light && { color: "#FFFFFF" }]}>
        Adhyay
      </Text>
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isSmall = width < 380;
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const submittingRef = useRef(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    message: "",
    type: "info",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: signupResolver,
    defaultValues: {
      email: "",
      password: "",
      role: "student",
    },
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ visible: true, message, type });
  };

  const onSubmit = async (data: SignupFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const email = data.email.trim().toLowerCase();
      console.log("[signup] selected role:", data.role);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: {
            role: data.role,
          },
        },
      });

      if (authError) {
        showToast(authError.message, "error");
        setLoading(false);
        return;
      }

      const newUser = authData.user ?? authData.session?.user;
      if (!newUser) {
        showToast("Registration failed: User could not be created.", "error");
        setLoading(false);
        return;
      }

      const userId = newUser.id;
      const hasSession = !!authData.session;
      console.log(
        "[signup] user id:",
        userId,
        "| active session:",
        hasSession,
        "| role:",
        data.role,
      );

      // Row creation lives in the DB trigger (handle_new_user), which reads
      // the role from auth metadata and bypasses RLS as security definer.
      // No client-side users/students/companies writes here — they would
      // just hit RLS denials and warn.
      await supabase.auth.signOut().catch(() => {});
      showToast(
        hasSession
          ? "Registration successful! Please sign in."
          : "Account created. Confirm your email, then sign in.",
        "success",
      );
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1200);
    } catch (e: any) {
      showToast(e.message || "Something went wrong.", "error");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        { flexDirection: isDesktop ? "row" : "column" },
      ]}
    >
      <AnimatedToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Brand panel: desktop only */}
      {isDesktop && (
        <View style={styles.sidePanel}>
          <View style={styles.sideGlow} />
          <Brand size={48} light />
          <View style={styles.sideCenter}>
            <Text style={styles.sideEyebrow}>
              CAMPUS RECRUITMENT MANAGEMENT
            </Text>
            <Text style={styles.sideTitle}>
              Start your{"\n"}
              <Text style={{ color: C.amber }}>chapter.</Text>
            </Text>
            <View style={styles.perkList}>
              {PERKS.map((perk) => (
                <View key={perk.text} style={styles.perkRow}>
                  <View style={styles.perkIcon}>
                    <MaterialCommunityIcons
                      name={perk.icon}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.perkText}>{perk.text}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.sideFooter}>
            © Adhyay • Developed for excellence.
          </Text>
        </View>
      )}

      {/* Form side */}
      <View style={styles.formSide}>
        {!isDesktop && (
          <>
            <View style={styles.ambientTop} />
            <View style={styles.ambientBottom} />
          </>
        )}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingHorizontal: isSmall ? 16 : isMobile ? 20 : 32,
              paddingTop: (isMobile ? 24 : 40) + topInset,
              paddingBottom: (isMobile ? 24 : 40) + bottomInset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, scale: 0.97, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320 }}
            style={styles.cardWrapper}
          >
            {!isDesktop && (
              <View style={styles.mobileBrand}>
                <Brand size={isSmall ? 44 : 52} />
              </View>
            )}

            <View
              style={[
                styles.card,
                { padding: isSmall ? 20 : isMobile ? 24 : 36 },
              ]}
            >
              <View style={styles.header}>
                <Text
                  style={[
                    styles.title,
                    { fontSize: isSmall ? 24 : isMobile ? 26 : 30 },
                  ]}
                >
                  Create Account
                </Text>
                <Text style={styles.subtitle}>
                  Join the placement portal today
                </Text>
              </View>

              {/* Role Selection */}
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
                          value: "student",
                          label: "Student",
                          checkedColor: "#FFFFFF",
                          uncheckedColor: C.muted,
                          style:
                            value === "student"
                              ? styles.segmentedActive
                              : styles.segmentedInactive,
                        },
                        {
                          value: "company",
                          label: "Company",
                          checkedColor: "#FFFFFF",
                          uncheckedColor: C.muted,
                          style:
                            value === "company"
                              ? styles.segmentedActive
                              : styles.segmentedInactive,
                        },
                      ]}
                      style={styles.segmentedButtons}
                    />
                  </View>
                )}
              />

              {/* Email Input */}
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
                      outlineColor={C.line}
                      activeOutlineColor={C.accent}
                      outlineStyle={{ borderRadius: 14, borderWidth: 1.5 }}
                      left={
                        <TextInput.Icon icon="email-outline" color={C.faint} />
                      }
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

              {/* Password Input */}
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
                      outlineColor={C.line}
                      activeOutlineColor={C.accent}
                      outlineStyle={{ borderRadius: 14, borderWidth: 1.5 }}
                      left={
                        <TextInput.Icon icon="lock-outline" color={C.faint} />
                      }
                      right={
                        <TextInput.Icon
                          icon={secureTextEntry ? "eye" : "eye-off"}
                          onPress={() => setSecureTextEntry(!secureTextEntry)}
                          color={C.muted}
                        />
                      }
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.password}
                      style={styles.textInput}
                    />
                    {errors.password && (
                      <HelperText
                        type="error"
                        visible={!!errors.password}
                        style={styles.errorText}
                      >
                        {errors.password.message}
                      </HelperText>
                    )}
                  </View>
                )}
              />

              {/* Submit Button */}
              <AnimatedPressable scaleTo={0.98} style={styles.buttonWrapper}>
                <Button
                  mode="contained"
                  loading={loading}
                  disabled={loading}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  buttonColor={C.ink}
                  textColor="#FFFFFF"
                >
                  Sign Up
                </Button>
              </AnimatedPressable>

              <View style={styles.divider} />

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Already have an account?{" "}
                  <Link href="/(auth)/login" style={styles.linkText}>
                    Sign In
                  </Link>
                </Text>
              </View>
            </View>

            {!isDesktop && (
              <Text style={styles.mobileFooter}>
                © Adhyay • Developed for excellence.
              </Text>
            )}
          </MotiView>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },

  /* Brand */
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.5,
  },

  /* Desktop side panel */
  sidePanel: {
    flex: 1,
    backgroundColor: C.ink,
    padding: 56,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  sideGlow: {
    position: "absolute",
    top: -180,
    right: -140,
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: "rgba(31, 91, 255, 0.35)",
  },
  sideCenter: { gap: 24, maxWidth: 520 },
  sideEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: C.amber,
  },
  sideTitle: {
    fontSize: 64,
    lineHeight: 70,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -2.5,
  },
  perkList: { gap: 16, marginTop: 8 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.inkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  perkText: { flex: 1, fontSize: 15, color: "#C6CBDA", lineHeight: 22 },
  sideFooter: { fontSize: 13, color: "#7C849A" },

  /* Form side */
  formSide: { flex: 1, backgroundColor: C.paper, overflow: "hidden" },
  ambientTop: {
    position: "absolute",
    top: -200,
    right: -150,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: "rgba(31, 91, 255, 0.07)",
  },
  ambientBottom: {
    position: "absolute",
    bottom: -220,
    left: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(245, 181, 68, 0.10)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  mobileBrand: { alignItems: "center", marginBottom: 20 },
  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow(16, 36, 0.08),
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: C.muted,
    textAlign: "center",
  },
  inputContainer: { marginBottom: 14 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    marginBottom: 6,
  },
  segmentedButtons: {
    backgroundColor: C.paper,
    borderRadius: 14,
  },
  segmentedActive: {
    backgroundColor: C.ink,
    borderRadius: 12,
  },
  segmentedInactive: {
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  textInput: {
    backgroundColor: C.card,
    fontSize: 16,
  },
  errorText: {
    paddingHorizontal: 0,
    marginTop: 2,
  },
  buttonWrapper: { marginTop: 12 },
  button: { borderRadius: 14 },
  buttonContent: { paddingVertical: 8 },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: C.line,
    marginTop: 24,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
  },
  linkText: {
    color: C.accent,
    fontWeight: "700",
  },
  mobileFooter: {
    marginTop: 20,
    fontSize: 13,
    color: C.faint,
    textAlign: "center",
  },
});
