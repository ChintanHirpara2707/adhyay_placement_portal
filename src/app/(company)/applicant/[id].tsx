import { TopNavbar } from "@/components/TopNavbar";
import { getInitials } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Theme } from "@/theme/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { z } from "zod";

const PRESET_TIME_SLOTS = [
  { label: "09:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:30 AM", value: "11:30" },
  { label: "01:30 PM", value: "13:30" },
  { label: "02:30 PM", value: "14:30" },
  { label: "04:00 PM", value: "16:00" },
  { label: "05:00 PM", value: "17:00" },
];

const scheduleSchema = z.object({
  round_number: z.coerce
    .number()
    .int()
    .min(1, { message: "Round must be >= 1" }),
  date_time: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, {
      message: "Use YYYY-MM-DDTHH:MM",
    }),
  notes: z.string().trim().max(500).optional().default(""),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

const scheduleResolver = (data: ScheduleForm) => {
  const r = scheduleSchema.safeParse(data);
  if (r.success) return { values: r.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  r.error.issues.forEach((e) => {
    errors[String(e.path[0])] = { type: e.code, message: e.message };
  });
  return { values: {}, errors };
};

export default function ApplicantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [app, setApp] = useState<any>(null);
  const [roundInterviews, setRoundInterviews] = useState<any[]>([]);
  const [marking, setMarking] = useState(false);

  // Dedicated Date & Slot States
  const [selectedDateStr, setSelectedDateStr] = useState<string>(""); // YYYY-MM-DD
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:00"); // Default to 10:00 AM

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ScheduleForm>({
    resolver: scheduleResolver,
    defaultValues: { round_number: 1, date_time: "", notes: "" },
  });

  const fetchStudentDetail = useCallback(async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, applied_at, job_id, student_id, current_round, students(full_name, branch, cgpa, phone, skills, resume_url), job_postings!inner(id, title, company_id, total_rounds, round_names, round_dates, companies(company_name))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        Alert.alert("Not found", "Application not found.");
        router.back();
        return;
      }
      if ((data as any).job_postings.company_id !== user.id) {
        Alert.alert("Access denied", "This applicant is not for your job.");
        router.back();
        return;
      }
      setApp(data);
      // Default the schedule form to the student's current round.
      setValue("round_number", (data as any).current_round ?? 1, { shouldValidate: false });
      // Suggest the announced round date (company can still adjust it).
      const announcedDates = (data as any).job_postings?.round_dates;
      const suggested = Array.isArray(announcedDates) ? announcedDates[((data as any).current_round ?? 1) - 1] : null;
      if (typeof suggested === "string" && /^\d{4}-\d{2}-\d{2}/.test(suggested.trim())) {
        const dayPart = suggested.trim().slice(0, 10);
        setSelectedDateStr(dayPart);
        setValue("date_time", `${dayPart}T${selectedTimeSlot}`, { shouldValidate: true });
      }
      const { data: ivs, error: ivError } = await supabase
        .from("interviews")
        .select("id, round_number, date_time, mode, result")
        .eq("application_id", (data as any).id)
        .order("round_number", { ascending: true });
      if (ivError) {
        console.warn("[rounds] interviews fetch:", ivError.message);
        setRoundInterviews([]);
      } else {
        setRoundInterviews((ivs as any[]) ?? []);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load applicant.");
    } finally {
      setLoading(false);
    }
  }, [id, user, router]);

  useFocusEffect(
    useCallback(() => {
      fetchStudentDetail();
    }, [fetchStudentDetail]),
  );

  const updateCombinedDateTime = (dateStr: string, timeStr: string) => {
    if (dateStr && timeStr) {
      const fullIso = `${dateStr}T${timeStr}`;
      setValue("date_time", fullIso, { shouldValidate: true });
    } else {
      setValue("date_time", "", { shouldValidate: true });
    }
  };

  const handleDateChange = (dateVal: string) => {
    setSelectedDateStr(dateVal);
    updateCombinedDateTime(dateVal, selectedTimeSlot);
  };

  const handleSelectSlot = (slotValue: string) => {
    setSelectedTimeSlot(slotValue);
    updateCombinedDateTime(selectedDateStr, slotValue);
  };

  const handleScheduleInterview = async (form: ScheduleForm) => {
    if (!app || !user) {
      Alert.alert(
        "Not ready",
        "Applicant data is still loading. Please wait and try again.",
      );
      return;
    }
    const dt = new Date(form.date_time);
    if (Number.isNaN(dt.getTime())) {
      Alert.alert(
        "Invalid date",
        "Please select both an interview date and time slot.",
      );
      return;
    }
    // Pre-flight: an expired/missing session makes every write fail.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      Alert.alert(
        "Session Expired",
        "Your login session expired. Please log out and sign in again, then retry.",
      );
      return;
    }
    setScheduling(true);
    try {
      const { error: ivError } = await supabase.from("interviews").insert({
        application_id: app.id,
        round_number: form.round_number || currentRound,
        date_time: dt.toISOString(),
        mode,
        notes: form.notes || null,
        result: "pending",
      });
      if (ivError) {
        Alert.alert(
          "Interview Save Failed",
          (ivError as any).message +
            "\n\nIf this is a permissions error, add the company INSERT policy on the interviews table.",
        );
        return;
      }

      // Read-back: prove the row actually persisted and is visible to this user.
      const { data: verifyRow, error: verifyError } = await supabase
        .from("interviews")
        .select("id")
        .eq("application_id", app.id)
        .eq("round_number", form.round_number || currentRound)
        .maybeSingle();
      if (verifyError || !verifyRow) {
        Alert.alert(
          "Verification Failed",
          "The save did not persist or is not visible (likely RLS). " +
            (verifyError?.message ?? "Row not found after insert."),
        );
        return;
      }

      const { error: appError } = await supabase
        .from("applications")
        .update({ status: "interview_scheduled" })
        .eq("id", app.id);
      if (appError) {
        Alert.alert(
          "Status Update Failed",
          "Interview was saved, but the application status could not be updated: " +
            appError.message,
        );
        return;
      }

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: app.student_id,
          message: `Interview scheduled (Round ${form.round_number}) for "${app.job_postings?.title ?? "the role"}" on ${dt.toLocaleString()}. Mode: ${mode}.`,
          read: false,
        });
      if (notifError) {
        Alert.alert(
          "Notification Failed",
          "Interview was scheduled, but the student notification could not be sent: " +
            notifError.message +
            "\n\nCompanies need an INSERT policy on notifications for their applicants' user ids.",
        );
        return;
      }

      Alert.alert("Scheduled", "Interview scheduled and student notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to schedule interview.");
    } finally {
      setScheduling(false);
    }
  };

  const roundName = (roundNum: number) => {
    const names = app?.job_postings?.round_names;
    if (Array.isArray(names) && names[roundNum - 1]) return names[roundNum - 1];
    return `Round ${roundNum}`;
  };
  const totalRounds = app?.job_postings?.total_rounds ?? 1;
  const currentRound = app?.current_round ?? 1;
  const companyName = app?.job_postings?.companies?.company_name ?? "the company";
  const jobTitle = app?.job_postings?.title ?? "the role";
  const currentInterview =
    roundInterviews.find((iv) => iv.round_number === currentRound) ?? null;
  const showMarkSection =
    !!currentInterview &&
    new Date(currentInterview.date_time).getTime() < Date.now() &&
    currentInterview.result === "pending" &&
    app?.status !== "selected" &&
    app?.status !== "rejected";
  const isPlaced = app?.status === "selected";

  const refreshRoundState = async () => {
    await fetchStudentDetail();
  };

  const handleMarkRejected = async () => {
    if (!app || !currentInterview) return;
    setMarking(true);
    try {
      const { error: ivError } = await supabase
        .from("interviews")
        .update({ result: "rejected" })
        .eq("id", currentInterview.id);
      if (ivError) {
        Alert.alert("Update Failed", "Could not mark round result: " + ivError.message);
        return;
      }
      const { error: appError } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", app.id);
      if (appError) {
        Alert.alert("Status Update Failed", "Round marked, but application status failed: " + appError.message);
        return;
      }
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: app.student_id,
        message: `Unfortunately, you were not selected after the ${roundName(currentRound)} for ${jobTitle} at ${companyName}.`,
        read: false,
      });
      if (notifError) {
        Alert.alert("Notification Failed", "Result saved, but the student notification failed: " + notifError.message);
        return;
      }
      Alert.alert("Saved", `${roundName(currentRound)} marked as rejected.`);
      await refreshRoundState();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save round result.");
    } finally {
      setMarking(false);
    }
  };

  const handleMarkSelected = async () => {
    if (!app || !currentInterview) return;
    setMarking(true);
    try {
      const { error: ivError } = await supabase
        .from("interviews")
        .update({ result: "cleared" })
        .eq("id", currentInterview.id);
      if (ivError) {
        Alert.alert("Update Failed", "Could not mark round result: " + ivError.message);
        return;
      }
      if (currentRound < totalRounds) {
        const nextRound = currentRound + 1;
        const { error: appError } = await supabase
          .from("applications")
          .update({ current_round: nextRound, status: "round_cleared" })
          .eq("id", app.id);
        if (appError) {
          Alert.alert("Status Update Failed", "Round marked, but advancing the round failed: " + appError.message);
          return;
        }
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: app.student_id,
          message: `Congratulations! You cleared the ${roundName(currentRound)} for ${jobTitle}. The next round will be scheduled soon.`,
          read: false,
        });
        if (notifError) {
          Alert.alert("Notification Failed", "Advanced to next round, but the student notification failed: " + notifError.message);
          return;
        }
        setValue("round_number", nextRound, { shouldValidate: true });
        Alert.alert("Saved", `${roundName(currentRound)} cleared. Schedule Round ${nextRound} below.`);
        await refreshRoundState();
      } else {
        const { error: appError } = await supabase
          .from("applications")
          .update({ status: "selected" })
          .eq("id", app.id);
        if (appError) {
          Alert.alert("Status Update Failed", "Round marked, but final selection failed: " + appError.message);
          return;
        }
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: app.student_id,
          message: `Congratulations! You have been placed at ${companyName} for the ${jobTitle} role!`,
          read: false,
        });
        if (notifError) {
          Alert.alert("Notification Failed", "Student placed, but the placement notification failed: " + notifError.message);
          return;
        }
        Alert.alert("Placed 🎉", `${student?.full_name ?? "Student"} is placed at ${companyName}.`);
        await refreshRoundState();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save round result.");
    } finally {
      setMarking(false);
    }
  };

  const student = app?.students;

  return (
    <View style={styles.container}>
      <TopNavbar
        title="Applicant Review"
        subtitle={student?.full_name ?? "Detail"}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.muted}>Loading applicant profile…</Text>
          </View>
        ) : !app ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.muted}>Applicant record not found.</Text>
          </View>
        ) : (
          <>
            {/* Candidate Identity Card */}
            <Card style={styles.card} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.candidateHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(student?.full_name, null)}
                    </Text>
                  </View>

                  <View style={styles.candidateInfo}>
                    <View style={styles.roleRow}>
                      <Text style={styles.statusBadge}>
                        {String(app.status).replace("_", " ").toUpperCase()}
                      </Text>
                      {student?.branch ? (
                        <Text style={styles.branchTag}>{student.branch}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.name}>
                      {student?.full_name ?? "Incomplete Profile"}
                    </Text>
                    <Text style={styles.subJob}>
                      Applying for:{" "}
                      <Text style={styles.subJobTitle}>
                        {app.job_postings?.title ?? "Role"}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Candidate Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>CGPA</Text>
                    <Text style={styles.statVal}>{student?.cgpa ?? "N/A"}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>DEPARTMENT</Text>
                    <Text style={styles.statVal}>
                      {student?.branch ?? "N/A"}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>CONTACT</Text>
                    <Text style={styles.statVal}>
                      {student?.phone ? student.phone : "Not provided"}
                    </Text>
                  </View>
                </View>

                {/* Skills */}
                {Array.isArray(student?.skills) && student.skills.length > 0 ? (
                  <View style={styles.skillsSection}>
                    <Text style={styles.fieldLabel}>Verified Skill Set</Text>
                    <View style={styles.skills}>
                      {student.skills.map((s: string, i: number) => (
                        <Chip
                          key={i}
                          style={styles.skillChip}
                          textStyle={styles.skillText}
                        >
                          {s}
                        </Chip>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Resume Document Link */}
                <View style={styles.resumeSection}>
                  <Text style={styles.fieldLabel}>Candidate Document</Text>
                  {student?.resume_url ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.resumeBox}
                      onPress={() => Linking.openURL(student.resume_url)}
                    >
                      <View style={styles.resumeIconWrap}>
                        <Text style={styles.resumeIcon}>📄</Text>
                      </View>
                      <View style={styles.resumeMeta}>
                        <Text style={styles.resumeTitle}>
                          Official Placement Resume
                        </Text>
                        <Text style={styles.resumeSubtitle} numberOfLines={1}>
                          Tap to open & evaluate portfolio link
                        </Text>
                      </View>
                      <Button
                        mode="text"
                        compact
                        textColor={Theme.colors.primaryAccent}
                      >
                        View
                      </Button>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emptyResumeBox}>
                      <Text style={styles.emptyResumeText}>
                        ⚠️ No resume attached with this application.
                      </Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            {/* Placement / round-result state */}
            {isPlaced ? (
              <Card style={styles.card} elevation={0}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.placedBanner}>
                    <Text style={styles.placedTitle}>Student Placed 🎉</Text>
                    <Text style={styles.placedText}>
                      {student?.full_name ?? "This student"} cleared all {totalRounds}{" "}
                      round{totalRounds === 1 ? "" : "s"} for {jobTitle}. No further
                      actions needed.
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ) : null}

            {showMarkSection ? (
              <Card style={styles.card} elevation={0}>
                <Card.Content style={styles.cardContent}>
                  <Text style={styles.sectionTitle}>Mark Round Result</Text>
                  <Text style={styles.sectionSubtitle}>
                    {roundName(currentRound)} · Round {currentRound} of {totalRounds} ·
                    interviewed on{" "}
                    {new Date(currentInterview.date_time).toLocaleString()}
                  </Text>
                  <View style={styles.markRow}>
                    <Button
                      mode="contained"
                      loading={marking}
                      disabled={marking}
                      onPress={handleMarkSelected}
                      buttonColor={Theme.colors.success}
                      textColor="#FFFFFF"
                      style={styles.markBtn}
                    >
                      Selected
                    </Button>
                    <Button
                      mode="outlined"
                      loading={marking}
                      disabled={marking}
                      onPress={handleMarkRejected}
                      textColor={Theme.colors.error}
                      style={styles.markBtn}
                    >
                      Rejected
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ) : null}

            {/* Interview Scheduler Card */}
            <Card style={styles.card} elevation={0}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Schedule Interview</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select date, time slot, and session format to notify the
                    candidate
                  </Text>
                </View>

                {/* Round (from job posting, not free input) */}
                <Controller
                  control={control}
                  name="round_number"
                  render={({ field: { value } }) => (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Interview Round</Text>
                      <View style={styles.roundDisplay}>
                        <Text style={styles.roundDisplayText}>
                          Round {value || currentRound}: {roundName(value || currentRound)}
                        </Text>
                        <Text style={styles.roundDisplaySub}>
                          of {totalRounds} configured round{totalRounds === 1 ? "" : "s"} for this job
                        </Text>
                      </View>
                      {errors.round_number ? (
                        <HelperText type="error" visible>
                          {errors.round_number.message}
                        </HelperText>
                      ) : null}
                    </View>
                  )}
                />

                {/* Interview Format Segment */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Session Mode</Text>
                  {/offline|on-campus|in-person/i.test(roundName(currentRound)) ? (
                    <HelperText type="info" visible style={styles.modeHint}>
                      Hint: this round is named "{roundName(currentRound)}" — on-campus mode may fit best.
                    </HelperText>
                  ) : /online|virtual|remote/i.test(roundName(currentRound)) ? (
                    <HelperText type="info" visible style={styles.modeHint}>
                      Hint: this round is named "{roundName(currentRound)}" — online mode may fit best.
                    </HelperText>
                  ) : null}
                  <SegmentedButtons
                    value={mode}
                    onValueChange={(v) => setMode(v as "online" | "offline")}
                    buttons={[
                      { value: "online", label: "💻 Online" },
                      { value: "offline", label: "🏢 On-Campus" },
                    ]}
                    style={styles.segment}
                  />
                </View>

                {/* Cross-Platform Date Picker (Web Browser Calendar + Native Input) */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Interview Date</Text>
                  {Platform.OS === "web" ? (
                    <View style={styles.webDateContainer}>
                      {/* Native HTML5 Calendar Picker for Web */}
                      <input
                        type="date"
                        value={selectedDateStr}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => handleDateChange(e.target.value)}
                        style={{
                          width: "100%",
                          height: 48,
                          padding: "0 12px",
                          borderRadius: 8,
                          border: `1px solid ${errors.date_time && !selectedDateStr ? "#EF4444" : "#CBD5E1"}`,
                          backgroundColor: "#FFFFFF",
                          fontSize: 14,
                          fontFamily: "inherit",
                          color: "#0F172A",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      />
                    </View>
                  ) : (
                    <TextInput
                      mode="outlined"
                      placeholder="YYYY-MM-DD (e.g. 2026-10-15)"
                      value={selectedDateStr}
                      onChangeText={handleDateChange}
                      style={styles.input}
                      outlineColor={
                        errors.date_time && !selectedDateStr
                          ? "#EF4444"
                          : "#E2E8F0"
                      }
                      activeOutlineColor={Theme.colors.primaryAccent}
                      right={<TextInput.Icon icon="calendar" />}
                    />
                  )}
                  {errors.date_time && !selectedDateStr ? (
                    <HelperText type="error" visible>
                      Please select an interview date.
                    </HelperText>
                  ) : null}
                </View>

                {/* Time Slot Method Selector */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    Select Interview Time Slot
                  </Text>
                  <View style={styles.slotGrid}>
                    {PRESET_TIME_SLOTS.map((slot) => {
                      const isSelected = selectedTimeSlot === slot.value;
                      return (
                        <TouchableOpacity
                          key={slot.value}
                          activeOpacity={0.8}
                          onPress={() => handleSelectSlot(slot.value)}
                          style={[
                            styles.slotItem,
                            isSelected && styles.slotItemSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotText,
                              isSelected && styles.slotTextSelected,
                            ]}
                          >
                            {slot.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom slot text input */}
                  <TextInput
                    mode="outlined"
                    placeholder="Or custom time (HH:MM e.g. 15:30)"
                    value={selectedTimeSlot}
                    onChangeText={(txt) => handleSelectSlot(txt.trim())}
                    style={styles.customTimeInput}
                    outlineColor="#E2E8F0"
                    activeOutlineColor={Theme.colors.primaryAccent}
                  />

                  {selectedDateStr && selectedTimeSlot ? (
                    <View style={styles.slotConfirmedBanner}>
                      <Text style={styles.slotConfirmedText}>
                        🕒 Selected Slot:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {selectedDateStr} at {selectedTimeSlot}
                        </Text>
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Notes */}
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        Meeting Instructions & Notes (Optional)
                      </Text>
                      <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        placeholder="Add Google Meet link, room number, or documents required..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        style={styles.input}
                        outlineColor="#E2E8F0"
                        activeOutlineColor={Theme.colors.primaryAccent}
                      />
                    </View>
                  )}
                />

                <Button
                  mode="contained"
                  loading={scheduling}
                  disabled={scheduling}
                  onPress={handleSubmit(handleScheduleInterview, () =>
                    Alert.alert(
                      "Incomplete Schedule",
                      "Please ensure interview round, date, and a time slot are selected.",
                    ),
                  )}
                  buttonColor={Theme.colors.primaryAccent}
                  textColor="#FFFFFF"
                  style={styles.submit}
                  contentStyle={styles.submitContent}
                >
                  Schedule & Notify Student
                </Button>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  body: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
  },
  cardContent: {
    padding: 16,
    gap: 14,
  },
  candidateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primaryAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 20,
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: Theme.colors.primaryAccent,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  branchTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  subJob: {
    fontSize: 12,
    color: "#64748B",
  },
  subJobTitle: {
    fontWeight: "600",
    color: "#334155",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  statVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  skillsSection: {
    marginTop: 4,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  skillChip: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
    color: "#334155",
  },
  resumeSection: {
    marginTop: 4,
  },
  resumeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 10,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  resumeIcon: {
    fontSize: 16,
  },
  resumeMeta: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
  },
  resumeSubtitle: {
    fontSize: 11,
    color: "#166534",
  },
  emptyResumeBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  emptyResumeText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500",
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  field: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  segment: {
    backgroundColor: "#FFFFFF",
  },
  webDateContainer: {
    marginBottom: 4,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  slotItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotItemSelected: {
    backgroundColor: Theme.colors.primaryAccent,
    borderColor: Theme.colors.primaryAccent,
  },
  slotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  slotTextSelected: {
    color: "#FFFFFF",
  },
  customTimeInput: {
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    marginTop: 4,
  },
  slotConfirmedBanner: {
    marginTop: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  slotConfirmedText: {
    fontSize: 12,
    color: Theme.colors.primaryAccent,
  },
  submit: {
    borderRadius: 8,
    marginTop: 8,
  },
  submitContent: {
    paddingVertical: 6,
  },
  roundDisplay: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  roundDisplayText: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.primaryAccent,
  },
  roundDisplaySub: {
    fontSize: 12,
    color: "#64748B",
  },
  modeHint: {
    fontSize: 12,
    paddingHorizontal: 0,
  },
  placedBanner: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  placedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#065F46",
  },
  placedText: {
    fontSize: 13,
    color: "#065F46",
    lineHeight: 19,
  },
  markRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  markBtn: {
    flex: 1,
    borderRadius: 8,
  },
});
