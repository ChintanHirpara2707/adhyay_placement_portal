import { TopNavbar } from "@/components/TopNavbar";
import { WebOnlyDecorations } from "@/components/WebOnlyDecorations";
import { getInitials } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Theme } from "@/theme/theme";
import { C } from "@/theme/design";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  HelperText,
  Menu,
  ProgressBar,
  Text,
  TextInput,
} from "react-native-paper";
import { z } from "zod";

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

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" }),
  branch: z.string().trim().min(1, { message: "Select your branch" }),
  cgpa: z.coerce
    .number()
    .min(0, { message: "CGPA must be at least 0" })
    .max(10, { message: "CGPA cannot exceed 10" }),
  phone: z
    .string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits" }),
  backlog_count: z.coerce
    .number()
    .int()
    .min(0, { message: "Backlogs cannot be negative" }),
  resume_link: z
    .string()
    .trim()
    .max(2000, { message: "Link is too long" })
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().url().safeParse(v).success, {
      message: "Enter a valid URL starting with http(s)://",
    }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const profileResolver = (data: ProfileFormData) => {
  const result = profileSchema.safeParse(data);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  result.error.issues.forEach((err) => {
    errors[String(err.path[0])] = { type: err.code, message: err.message };
  });
  return { values: {}, errors };
};

export default function StudentProfileScreen() {
  const { user } = useAuthStore();
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedResumeUrl, setSavedResumeUrl] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [branchMenu, setBranchMenu] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: profileResolver,
    defaultValues: {
      full_name: "",
      branch: "",
      cgpa: 0,
      phone: "",
      backlog_count: 0,
      resume_link: "",
    },
  });
  const watchedName = watch("full_name");
  const watchedBranch = watch("branch");
  const watchedCgpa = watch("cgpa");
  const watchedPhone = watch("phone");
  const watchedResumeLink = watch("resume_link");

  const fetchExistingProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        Alert.alert("Error", "Failed to fetch profile: " + error.message);
        return;
      }
      if (data) {
        const vals: ProfileFormData = {
          full_name: data.full_name ?? "",
          branch: data.branch ?? "",
          cgpa: data.cgpa ?? 0,
          phone: data.phone ?? "",
          backlog_count: data.backlog_count ?? 0,
          resume_link: data.resume_url ?? "",
        };
        reset(vals);
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setSkillsDirty(false);
        setSavedResumeUrl(data.resume_url ?? null);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchExistingProfile();
  }, [user]);

  const completion = (() => {
    const parts = [
      watchedName?.trim(),
      watchedBranch?.trim(),
      watchedCgpa,
      watchedPhone?.trim(),
      skills.length > 0 ? "x" : "",
      watchedResumeLink?.trim(),
    ];
    const filled = parts.filter(
      (p) => p !== "" && p !== null && p !== undefined && p !== 0,
    ).length;
    return Math.round((filled / parts.length) * 100);
  })();

  const addSkill = (raw: string) => {
    const bits = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (bits.length === 0) return;
    setSkills((prev) =>
      [...prev, ...bits.filter((b) => !prev.includes(b))].slice(0, 20),
    );
    setSkillsDirty(true);
    setSkillInput("");
  };

  const removeSkill = (s: string) => {
    setSkills((prev) => prev.filter((x) => x !== s));
    setSkillsDirty(true);
  };

  const handleSave = async (form: ProfileFormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const resumeUrl = form.resume_link?.trim()
        ? form.resume_link.trim()
        : null;
      const { error } = await supabase
        .from("students")
        .update({
          full_name: form.full_name.trim(),
          branch: form.branch,
          cgpa: form.cgpa,
          phone: form.phone.trim(),
          backlog_count: form.backlog_count,
          skills,
          resume_url: resumeUrl,
        })
        .eq("id", user.id);
      if (error) {
        Alert.alert("Save Error", error.message);
        return;
      }
      reset(form);
      setSkillsDirty(false);
      setSavedResumeUrl(resumeUrl);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = isDirty || skillsDirty;

  if (fetching) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Theme.colors.primaryAccent} />
        <Text style={styles.muted}>Loading placement profile…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <WebOnlyDecorations />
      <TopNavbar
        title="Candidate Profile"
        subtitle="Campus Placement & Drive Record"
      />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Profile Summary */}
        <Card style={styles.heroCard} elevation={0}>
          <Card.Content style={styles.heroCardContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(watchedName, user?.email)}
                </Text>
              </View>
              <View style={styles.heroInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.roleBadge}>STUDENT APPLICANT</Text>
                  {watchedBranch ? (
                    <Text style={styles.branchTag}>{watchedBranch}</Text>
                  ) : null}
                </View>
                <Text style={styles.avatarName} numberOfLines={1}>
                  {watchedName || "Your Name"}
                </Text>
                <Text style={styles.avatarEmail} numberOfLines={1}>
                  {user?.email ?? ""}
                </Text>
              </View>
            </View>

            <View style={styles.meterContainer}>
              <View style={styles.completeRow}>
                <Text style={styles.completeLabel}>Profile Readiness</Text>
                <Text style={styles.completePercent}>{completion}%</Text>
              </View>
              <ProgressBar
                progress={completion / 100}
                color={Theme.colors.primaryAccent}
                style={styles.bar}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Section 1: Academic Overview */}
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Academic Records</Text>
              <Text style={styles.sectionSubtitle}>
                Verified eligibility criteria for upcoming drives
              </Text>
            </View>

            <Controller
              control={control}
              name="branch"
              render={({ field: { onChange, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Degree / Department</Text>
                  <Menu
                    visible={branchMenu}
                    onDismiss={() => setBranchMenu(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setBranchMenu(true)}
                        style={styles.dropdown}
                        contentStyle={styles.dropdownContent}
                        textColor={
                          value
                            ? Theme.colors.primaryText
                            : Theme.colors.secondaryText
                        }
                        icon="chevron-down"
                      >
                        {value
                          ? `Department of ${value}`
                          : "Select registered branch"}
                      </Button>
                    }
                    contentStyle={styles.menuContent}
                  >
                    {BRANCHES.map((b) => (
                      <Menu.Item
                        key={b}
                        onPress={() => {
                          onChange(b);
                          setBranchMenu(false);
                        }}
                        title={`Department of ${b}`}
                      />
                    ))}
                  </Menu>
                  {errors.branch ? (
                    <HelperText type="error" visible>
                      {errors.branch.message}
                    </HelperText>
                  ) : null}
                </View>
              )}
            />

            <View style={styles.twoColRow}>
              <View style={[styles.field, styles.halfCol]}>
                <Controller
                  control={control}
                  name="cgpa"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <>
                      <Text style={styles.label}>Cumulative CGPA (0-10)</Text>
                      <TextInput
                        mode="outlined"
                        placeholder="e.g. 8.45"
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value ? String(value) : ""}
                        error={!!errors.cgpa}
                        style={styles.input}
                        outlineColor={C.line}
                        activeOutlineColor={Theme.colors.primaryAccent}
                      />
                      {errors.cgpa ? (
                        <HelperText type="error" visible>
                          {errors.cgpa.message}
                        </HelperText>
                      ) : null}
                    </>
                  )}
                />
              </View>

              <View style={[styles.field, styles.halfCol]}>
                <Controller
                  control={control}
                  name="backlog_count"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <>
                      <Text style={styles.label}>Active Backlogs</Text>
                      <TextInput
                        mode="outlined"
                        placeholder="0"
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value != null ? String(value) : ""}
                        error={!!errors.backlog_count}
                        style={styles.input}
                        outlineColor={C.line}
                        activeOutlineColor={Theme.colors.primaryAccent}
                      />
                      {errors.backlog_count ? (
                        <HelperText type="error" visible>
                          {errors.backlog_count.message}
                        </HelperText>
                      ) : null}
                    </>
                  )}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Section 2: Contact & Identification */}
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Text style={styles.sectionSubtitle}>
                Primary details recruiters use for communications
              </Text>
            </View>

            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Legal Full Name</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g. John Doe"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.full_name}
                    style={styles.input}
                    outlineColor={C.line}
                    activeOutlineColor={Theme.colors.primaryAccent}
                  />
                  {errors.full_name ? (
                    <HelperText type="error" visible>
                      {errors.full_name.message}
                    </HelperText>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.phone}
                    style={styles.input}
                    outlineColor={C.line}
                    activeOutlineColor={Theme.colors.primaryAccent}
                  />
                  {errors.phone ? (
                    <HelperText type="error" visible>
                      {errors.phone.message}
                    </HelperText>
                  ) : null}
                </View>
              )}
            />
          </Card.Content>
        </Card>

        {/* Section 3: Technical Skills */}
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Technical Competencies</Text>
              <Text style={styles.sectionSubtitle}>
                Add frameworks, languages, or tools (press Enter or plus)
              </Text>
            </View>

            <View style={styles.field}>
              <TextInput
                mode="outlined"
                placeholder="Type skill (e.g. React, Python) and press '+'"
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={() => addSkill(skillInput)}
                returnKeyType="done"
                style={styles.input}
                outlineColor={C.line}
                activeOutlineColor={Theme.colors.primaryAccent}
                right={
                  <TextInput.Icon
                    icon="plus"
                    onPress={() => addSkill(skillInput)}
                  />
                }
              />
              <View style={styles.chipsContainer}>
                {skills.length === 0 ? (
                  <Text style={styles.emptySkillsText}>
                    No skills added yet. Add relevant tags to improve job
                    matching.
                  </Text>
                ) : (
                  skills.map((s) => (
                    <Chip
                      key={s}
                      onClose={() => removeSkill(s)}
                      style={styles.chip}
                      textStyle={styles.chipText}
                    >
                      {s}
                    </Chip>
                  ))
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Section 4: Resume Asset */}
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Placement Resume</Text>
              <Text style={styles.sectionSubtitle}>
                Recruiters evaluate this link during shortlisting
              </Text>
            </View>

            {savedResumeUrl ? (
              <View style={styles.resumeActiveBanner}>
                <View style={styles.resumeBadgeRow}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.resumeBannerLabel}>
                    ACTIVE VERIFIED LINK
                  </Text>
                </View>
                <Text
                  style={styles.resumeBannerLink}
                  numberOfLines={1}
                  onPress={() => Linking.openURL(savedResumeUrl)}
                >
                  🔗 {savedResumeUrl}
                </Text>
              </View>
            ) : (
              <View style={styles.resumeMissingBanner}>
                <Text style={styles.resumeMissingText}>
                  ⚠️ No resume linked yet. Recruiters will not be able to
                  evaluate your profile.
                </Text>
              </View>
            )}

            <Controller
              control={control}
              name="resume_link"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Drive or Portfolio URL</Text>
                  <TextInput
                    mode="outlined"
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://drive.google.com/..."
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.resume_link}
                    style={styles.input}
                    outlineColor={C.line}
                    activeOutlineColor={Theme.colors.primaryAccent}
                  />
                  {errors.resume_link ? (
                    <HelperText type="error" visible>
                      {errors.resume_link.message}
                    </HelperText>
                  ) : (
                    <HelperText type="info" visible style={styles.helperText}>
                      Ensure sharing is set to “Anyone with the link can view”
                      to prevent access failures.
                    </HelperText>
                  )}
                </View>
              )}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Persistent Bottom Bar */}
      <View style={styles.footerContainer}>
        <View style={styles.footerInner}>
          <View style={styles.footerState}>
            <Text style={styles.footerStateLabel}>
              {canSave ? "Unsaved changes pending" : "Profile up to date"}
            </Text>
          </View>
          <Button
            mode="contained"
            loading={saving}
            disabled={!canSave || saving}
            onPress={handleSubmit(handleSave)}
            buttonColor={Theme.colors.primaryAccent}
            textColor={C.card}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save Changes
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.paper,
  },
  muted: {
    color: C.muted,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    padding: 16,
    gap: 16,
    paddingBottom: 90,
  },

  /* Hero Header Card */
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  heroCardContent: {
    padding: 16,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primaryAccent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Theme.colors.primaryAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarText: {
    color: C.card,
    fontWeight: "700",
    fontSize: 22,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: Theme.colors.primaryAccent,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  branchTag: {
    fontSize: 10,
    fontWeight: "600",
    color: C.muted,
    backgroundColor: C.soft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  avatarName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.ink,
  },
  avatarEmail: {
    fontSize: 13,
    color: C.muted,
  },
  meterContainer: {
    marginTop: 4,
    backgroundColor: C.paper,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.soft,
  },
  completeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  completeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.ink,
  },
  completePercent: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primaryAccent,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.line,
  },

  /* Form Section Cards */
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },

  /* Input & Two Column */
  twoColRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  field: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
    marginBottom: 5,
  },
  input: {
    backgroundColor: C.card,
    fontSize: 14,
  },
  dropdown: {
    borderRadius: 8,
    borderColor: C.line,
    borderWidth: 1,
  },
  dropdownContent: {
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  menuContent: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
  },

  /* Skills */
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    minHeight: 32,
  },
  chip: {
    backgroundColor: C.soft,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    color: C.ink,
    fontWeight: "500",
  },
  emptySkillsText: {
    fontSize: 12,
    color: C.faint,
    fontStyle: "italic",
  },

  /* Resume Banners */
  resumeActiveBanner: {
    gap: 4,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  resumeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },
  resumeBannerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.success,
    letterSpacing: 0.5,
  },
  resumeBannerLink: {
    fontSize: 12,
    color: Theme.colors.primaryAccent,
    textDecorationLine: "underline",
  },
  resumeMissingBanner: {
    backgroundColor: C.warningSoft,
    borderWidth: 1,
    borderColor: C.warning,
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  resumeMissingText: {
    fontSize: 12,
    color: C.warning,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 11,
    color: C.muted,
    paddingHorizontal: 0,
    marginTop: 4,
  },

  /* Bottom Sticky Action Bar */
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerState: {
    flex: 1,
  },
  footerStateLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
  },
  saveButton: {
    borderRadius: 8,
    minWidth: 140,
  },
  saveButtonContent: {
    paddingVertical: 4,
  },
});
