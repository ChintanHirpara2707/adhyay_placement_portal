import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DateField, TimeField } from "@/components/DateField";
import { formatLongDate, formatTime } from "@/lib/dates";
import { TopNavbar } from "@/components/TopNavbar";
import { getInitials, parseDbDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { C } from "@/theme/design";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { NO_ROWS_MESSAGE, showAlert } from "@/lib/alert";
import { useLoadState } from "@/hooks/useLoadState";
import { useScreenReady } from "@/hooks/useScreenReady";
import { FormSkeleton } from "@/components/loading/FormSkeleton";
import { LoadError } from "@/components/loading/LoadError";
import {
  Card,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { Button } from "@/components/ui/AppButton";
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
  const { loading, error: loadError, begin, succeed, fail, end } = useLoadState('this applicant');
  useScreenReady(!loading);
  const [scheduling, setScheduling] = useState(false);
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [app, setApp] = useState<any>(null);
  const [roundInterviews, setRoundInterviews] = useState<any[]>([]);
  const [marking, setMarking] = useState(false);
  // Ref guards: state updates are async, so a fast double tap could otherwise fire twice.
  const schedulingRef = useRef(false);
  const markingRef = useRef(false);

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
    begin();
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, applied_at, job_id, student_id, current_round, students(full_name, branch, cgpa, phone, skills, resume_url), job_postings!inner(id, title, company_id, total_rounds, round_names, round_dates, companies(company_name))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        showAlert("Not found", "Application not found.");
        router.back();
        return;
      }
      if ((data as any).job_postings.company_id !== user.id) {
        showAlert("Access denied", "This applicant is not for your job.");
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
      succeed();
    } catch (e: any) {
      fail(e);
    } finally {
      end();
    }
  }, [id, user, router, begin, succeed, fail, end]);

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
      showAlert(
        "Not ready",
        "Applicant data is still loading. Please wait and try again.",
      );
      return;
    }
    const dt = new Date(form.date_time);
    if (Number.isNaN(dt.getTime())) {
      showAlert(
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
      showAlert(
        "Session Expired",
        "Your login session expired. Please log out and sign in again, then retry.",
      );
      return;
    }
    if (app.status === "rejected" || app.status === "selected") {
      showAlert("Cannot schedule", `This application is already ${app.status}.`);
      return;
    }
    if (schedulingRef.current) return;
    schedulingRef.current = true;
    setScheduling(true);
    try {
      const roundNo = form.round_number || currentRound;
      const existing = roundInterviews.find((iv) => iv.round_number === roundNo);
      if (existing && existing.result !== "pending") {
        showAlert("Round already completed", `Round ${roundNo} already has a result (${existing.result}).`);
        return;
      }
      const payload = {
        application_id: app.id,
        round_number: roundNo,
        date_time: dt.toISOString(),
        mode,
        notes: (form.notes ?? "").trim() || null,
        result: "pending",
      };
      // Rescheduling an existing pending round updates it instead of creating a duplicate row.
      const { data: saved, error: ivError } = existing
        ? await supabase.from("interviews").update(payload).eq("id", existing.id).select("id")
        : await supabase.from("interviews").insert(payload).select("id");
      if (ivError) {
        showAlert(
          "Interview Save Failed",
          (ivError as any).message +
            "\n\nIf this is a permissions error, add the company INSERT/UPDATE policy on the interviews table.",
        );
        return;
      }
      // select() proves the row persisted and is visible to this user.
      if (!saved || saved.length === 0) {
        showAlert("Interview not saved", NO_ROWS_MESSAGE);
        return;
      }

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .update({ status: "interview_scheduled" })
        .eq("id", app.id)
        .select("id");
      if (appError || !appRows || appRows.length === 0) {
        showAlert(
          "Status Update Failed",
          "Interview was saved, but the application status could not be updated: " +
            (appError?.message ?? NO_ROWS_MESSAGE),
        );
        return;
      }

      const noteText = (form.notes ?? "").trim();
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: app.student_id,
          message: `Interview ${existing ? "rescheduled" : "scheduled"} (Round ${roundNo}) for "${app.job_postings?.title ?? "the role"}" on ${dt.toLocaleString()}. Mode: ${mode}.${noteText ? ` Notes: ${noteText}` : ""}`,
          read: false,
        });
      if (notifError) {
        showAlert(
          "Notification Failed",
          "Interview was scheduled, but the student notification could not be sent: " +
            notifError.message +
            "\n\nCompanies need an INSERT policy on notifications for their applicants' user ids.",
        );
        return;
      }

      showAlert("Scheduled", "Interview scheduled and student notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to schedule interview.");
    } finally {
      schedulingRef.current = false;
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
    parseDbDate(currentInterview.date_time).getTime() < Date.now() &&
    currentInterview.result === "pending" &&
    app?.status !== "selected" &&
    app?.status !== "rejected";
  const isPlaced = app?.status === "selected";

  const refreshRoundState = async () => {
    await fetchStudentDetail();
  };

  const handleMarkRejected = async () => {
    if (!app || !currentInterview || markingRef.current) return;
    markingRef.current = true;
    setMarking(true);
    try {
      const { data: ivRows, error: ivError } = await supabase
        .from("interviews")
        .update({ result: "rejected" })
        .eq("id", currentInterview.id)
        .select("id");
      if (ivError || !ivRows || ivRows.length === 0) {
        showAlert("Update Failed", "Could not mark round result: " + (ivError?.message ?? NO_ROWS_MESSAGE));
        return;
      }
      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", app.id)
        .select("id");
      if (appError || !appRows || appRows.length === 0) {
        showAlert("Status Update Failed", "Round marked, but application status failed: " + (appError?.message ?? NO_ROWS_MESSAGE));
        return;
      }
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: app.student_id,
        message: `Unfortunately, you were not selected after the ${roundName(currentRound)} for ${jobTitle} at ${companyName}.`,
        read: false,
      });
      if (notifError) {
        showAlert("Notification Failed", "Result saved, but the student notification failed: " + notifError.message);
        return;
      }
      showAlert("Saved", `${roundName(currentRound)} marked as rejected.`);
      await refreshRoundState();
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to save round result.");
    } finally {
      markingRef.current = false;
      setMarking(false);
    }
  };

  const handleMarkSelected = async () => {
    if (!app || !currentInterview || markingRef.current) return;
    markingRef.current = true;
    setMarking(true);
    try {
      const { data: ivRows, error: ivError } = await supabase
        .from("interviews")
        .update({ result: "cleared" })
        .eq("id", currentInterview.id)
        .select("id");
      if (ivError || !ivRows || ivRows.length === 0) {
        showAlert("Update Failed", "Could not mark round result: " + (ivError?.message ?? NO_ROWS_MESSAGE));
        return;
      }
      if (currentRound < totalRounds) {
        const nextRound = currentRound + 1;
        const { data: appRows, error: appError } = await supabase
          .from("applications")
          .update({ current_round: nextRound, status: "round_cleared" })
          .eq("id", app.id)
          .select("id");
        if (appError || !appRows || appRows.length === 0) {
          showAlert("Status Update Failed", "Round marked, but advancing the round failed: " + (appError?.message ?? NO_ROWS_MESSAGE));
          return;
        }
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: app.student_id,
          message: `Congratulations! You cleared the ${roundName(currentRound)} for ${jobTitle}. The next round will be scheduled soon.`,
          read: false,
        });
        if (notifError) {
          showAlert("Notification Failed", "Advanced to next round, but the student notification failed: " + notifError.message);
          return;
        }
        setValue("round_number", nextRound, { shouldValidate: true });
        showAlert("Saved", `${roundName(currentRound)} cleared. Schedule Round ${nextRound} below.`);
        await refreshRoundState();
      } else {
        const { data: appRows, error: appError } = await supabase
          .from("applications")
          .update({ status: "selected" })
          .eq("id", app.id)
          .select("id");
        if (appError || !appRows || appRows.length === 0) {
          showAlert("Status Update Failed", "Round marked, but final selection failed: " + (appError?.message ?? NO_ROWS_MESSAGE));
          return;
        }
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: app.student_id,
          message: `Congratulations! You have been placed at ${companyName} for the ${jobTitle} role!`,
          read: false,
        });
        if (notifError) {
          showAlert("Notification Failed", "Student placed, but the placement notification failed: " + notifError.message);
          return;
        }
        showAlert("Placed", `${student?.full_name ?? "Student"} is placed at ${companyName}.`);
        await refreshRoundState();
      }
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to save round result.");
    } finally {
      markingRef.current = false;
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
          <FormSkeleton withHeader cards={2} fields={2} />
        ) : loadError ? (
          <LoadError message={loadError} onRetry={fetchStudentDetail} />
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
                        <MaterialCommunityIcons name="file-document-outline" size={18} color={C.accent} />
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
                        textColor={C.accent}
                      >
                        View
                      </Button>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emptyResumeBox}>
                      <Text style={styles.emptyResumeText}>
                        No resume attached with this application.
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
                    <Text style={styles.placedTitle}>Student placed</Text>
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
                    {parseDbDate(currentInterview.date_time).toLocaleString()}
                  </Text>
                  <View style={styles.markRow}>
                    <Button
                      mode="contained"
                      loading={marking}
                      disabled={marking}
                      onPress={handleMarkSelected}
                      buttonColor={C.success}
                      textColor="#FFFFFF"
                      style={styles.markBtn}
                      contentStyle={styles.markBtnContent}
                    >
                      Selected
                    </Button>
                    <Button
                      mode="outlined"
                      loading={marking}
                      disabled={marking}
                      onPress={handleMarkRejected}
                      textColor={C.danger}
                      style={styles.markBtn}
                      contentStyle={styles.markBtnContent}
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
                      { value: "online", label: "Online", icon: "laptop" },
                      { value: "offline", label: "On-Campus", icon: "office-building-outline" },
                    ]}
                    style={styles.segment}
                  />
                </View>

                {/* Cross-Platform Date Picker (Web Browser Calendar + Native Input) */}
                <View style={styles.field}>
                  <DateField
                    label="Interview date"
                    value={selectedDateStr}
                    onChange={handleDateChange}
                    error={errors.date_time && !selectedDateStr ? "Please select an interview date." : undefined}
                  />
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

                  {/* Custom time via the native time picker */}
                  <TimeField label="Or pick a custom time" value={selectedTimeSlot} onChange={handleSelectSlot} />

                  {selectedDateStr && selectedTimeSlot ? (
                    <View style={styles.slotConfirmedBanner}>
                      <Text style={styles.slotConfirmedText}>
                        Selected slot:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {formatLongDate(selectedDateStr)} at {formatTime(selectedTimeSlot)}
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
                        outlineColor={C.line}
                        activeOutlineColor={C.accent}
                      />
                    </View>
                  )}
                />

                <Button
                  mode="contained"
                  loading={scheduling}
                  disabled={scheduling}
                  onPress={handleSubmit(handleScheduleInterview, () =>
                    showAlert(
                      "Incomplete Schedule",
                      "Please ensure interview round, date, and a time slot are selected.",
                    ),
                  )}
                  buttonColor={C.accent}
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
    backgroundColor: C.paper,
  },
  body: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
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
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.accentStrong,
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
    color: C.accent,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 7,
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
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: C.ink,
  },
  subJob: {
    fontSize: 13,
    color: C.muted,
  },
  subJobTitle: {
    fontWeight: "600",
    color: C.ink,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: C.line,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: "600",
    color: C.ink,
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
    backgroundColor: C.soft,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
    color: C.ink,
  },
  resumeSection: {
    marginTop: 4,
  },
  resumeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 10,
    minHeight: 56,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeMeta: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.ink,
  },
  resumeSubtitle: {
    fontSize: 12,
    color: C.muted,
  },
  emptyResumeBox: {
    backgroundColor: C.warningSoft,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  emptyResumeText: {
    fontSize: 13,
    color: C.warning,
    fontWeight: "500",
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.ink,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 1,
  },
  field: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: C.inkSoft,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    backgroundColor: C.card,
    fontSize: 16,
  },
  segment: {
    backgroundColor: C.card,
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
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  slotItemSelected: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  slotText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.ink,
  },
  slotTextSelected: {
    color: C.accentStrong,
    fontWeight: "600",
  },
  customTimeInput: {
    backgroundColor: C.card,
    fontSize: 16,
    marginTop: 4,
  },
  slotConfirmedBanner: {
    marginTop: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  slotConfirmedText: {
    fontSize: 13,
    color: C.accentStrong,
  },
  submit: {
    borderRadius: 10,
    marginTop: 8,
  },
  submitContent: {
    paddingVertical: 6,
    minHeight: 48,
  },
  roundDisplay: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  roundDisplayText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.accentStrong,
  },
  roundDisplaySub: {
    fontSize: 12,
    color: C.muted,
  },
  modeHint: {
    fontSize: 12,
    paddingHorizontal: 0,
  },
  placedBanner: {
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  placedTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.success,
  },
  placedText: {
    fontSize: 13,
    color: C.success,
    lineHeight: 19,
  },
  markRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  markBtn: {
    flex: 1,
    borderRadius: 10,
  },
  markBtnContent: {
    minHeight: 48,
  },
});
