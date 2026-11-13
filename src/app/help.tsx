import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { showAlert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/format';
import { C } from '@/theme/design';
import { TopNavbar } from '@/components/TopNavbar';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/AppButton';
import { Card, EmptyState, StatusChip } from '@/components/ui/kit';

type Audience = 'all' | 'student' | 'company';

const FAQS: { audience: Audience; q: string; a: string }[] = [
  { audience: 'all', q: 'What is the Adhyay Placement Portal?', a: 'One place for campus recruitment: students find and register for eligible drives, companies post drives and run interview rounds, and the placement cell approves companies and tracks results.' },
  { audience: 'all', q: 'I forgot my password. What do I do?', a: 'On the login screen choose "Forgot password", enter your email, then type the code we send you and set a new password. Check your spam folder if the email does not arrive.' },
  { audience: 'all', q: 'Who can see my information?', a: 'The placement cell can see all records. A company sees only the students who registered for its drives. Resumes are private files shared through short-lived links.' },
  { audience: 'student', q: 'Why can I not see a particular drive?', a: 'You only see drives you are eligible for: your CGPA must meet the minimum, your branch must be listed and your backlogs must be allowed. Make sure your profile has your CGPA and branch filled in.' },
  { audience: 'student', q: 'How do I register for a drive, and can I withdraw?', a: 'Open the drive and tap Register before the deadline. To withdraw, go to Applications and tap "Withdraw registration" — this works only while your status is still "Applied" and the deadline has not passed. You can register again afterwards.' },
  { audience: 'student', q: 'How do I add my resume?', a: 'Open Profile, then Upload PDF (PDF only, up to 5 MB). Tap Replace PDF to change it. "Download CV" builds a one-page CV from your profile details.' },
  { audience: 'student', q: 'Where do I find interview details and meeting links?', a: 'The Interviews tab lists every round with its date, mode and the company\'s notes (such as a meeting link). The same notes are in your notification. If a company reschedules or cancels, you are notified with the reason.' },
  { audience: 'student', q: 'How do I accept or decline an offer?', a: 'When you are selected, open Applications, then Accept or Decline on that card. You can add an optional note. You can answer only once, and the company is notified.' },
  { audience: 'student', q: 'What do the bookmark and "Not interested" options do?', a: 'Bookmark saves a drive to your Saved list and Not interested hides it. Both follow your account to every device. You also get a reminder 24 hours and 2 hours before a saved or eligible drive closes.' },
  { audience: 'student', q: 'My account was debarred. What now?', a: 'The sign-in message shows the reason given by the placement cell. Use the contact form below (from another account) or speak to the placement office to have it reviewed.' },
  { audience: 'company', q: 'Why can I not post a job?', a: 'Companies must be approved by the placement cell first. If your registration was not approved, your dashboard shows the reason — update your profile and tap "Resubmit for review".' },
  { audience: 'company', q: 'How do I run interview rounds?', a: 'Open a drive\'s applicants, shortlist a candidate, then schedule the interview for their current round. You can reschedule or cancel with a reason, and students are notified. After the interview, mark the round Selected or Rejected.' },
  { audience: 'company', q: 'How do I add my logo?', a: 'Open Profile and tap Upload logo (PNG, JPG or WebP, up to 2 MB). Students then see it on your drives.' },
];

const contactSchema = z.object({
  subject: z.string().trim().min(3, { message: 'Subject must be at least 3 characters' }).max(120, { message: 'Keep the subject under 120 characters' }),
  message: z.string().trim().min(10, { message: 'Please describe your question (at least 10 characters)' }).max(2000, { message: 'Keep the message under 2000 characters' }),
});
type ContactForm = z.infer<typeof contactSchema>;

const contactResolver = (data: ContactForm) => {
  const r = contactSchema.safeParse(data);
  if (r.success) return { values: r.data, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  r.error.issues.forEach((e) => {
    errors[String(e.path[0])] = { type: e.code, message: e.message };
  });
  return { values: {}, errors };
};

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'resolved';
  admin_reply: string | null;
  created_at: string;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.faq}>
      <View style={styles.faqHead}>
        <Text style={styles.faqQ}>{q}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={C.muted} />
      </View>
      {open ? <Text style={styles.faqA}>{a}</Text> : null}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const { user, role, session } = useAuthStore();
  const [filter, setFilter] = useState('');
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>({
    resolver: contactResolver,
    defaultValues: { subject: '', message: '' },
  });

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, admin_reply, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      console.warn('[help] tickets load failed:', error.message);
      setTickets([]);
      return;
    }
    setTickets((data as Ticket[]) ?? []);
  }, [user]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submit = async (form: ContactForm) => {
    if (!user || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({ user_id: user.id, subject: form.subject.trim(), message: form.message.trim() })
        .select('id');
      if (error || !data || data.length === 0) {
        showAlert('Could not send your query', error?.message ?? 'Nothing was saved. Please try again.');
        return;
      }
      reset({ subject: '', message: '' });
      showAlert('Query sent', 'The placement cell has received your message. Replies appear below and in your notifications.');
      loadTickets();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const audience: Audience | null = role === 'student' || role === 'company' ? role : null;
  const q = filter.trim().toLowerCase();
  const visibleFaqs = FAQS.filter((f) => f.audience === 'all' || f.audience === audience).filter(
    (f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
  );

  return (
    <View style={styles.page}>
      {session ? (
        <TopNavbar title="Help & support" subtitle="FAQs and contact" showBack />
      ) : (
        <View style={styles.plainHeader}>
          <Button mode="text" icon="arrow-left" onPress={() => router.back()} textColor={C.accent}>
            Back
          </Button>
        </View>
      )}
      <Screen>
        <View style={styles.column}>
          <Text style={styles.heading}>How can we help?</Text>
          <Text style={styles.sub}>Quick answers first. Still stuck? Send a message to the placement cell.</Text>
        </View>

        <Card style={styles.column}>
          <TextInput
            mode="outlined"
            placeholder="Search the FAQs"
            value={filter}
            onChangeText={setFilter}
            left={<TextInput.Icon icon="magnify" color={C.faint} />}
            style={styles.input}
            outlineColor={C.line}
            activeOutlineColor={C.accent}
            outlineStyle={styles.outline}
          />
          {visibleFaqs.length === 0 ? (
            <EmptyState icon="help-circle-outline" title="No matching answers" hint="Try different words, or send us a message below." />
          ) : (
            visibleFaqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)
          )}
        </Card>

        <Card style={styles.column}>
          <Text style={styles.cardTitle}>Contact the placement cell</Text>
          {!user ? (
            <Text style={styles.sub}>Sign in to send a message to the placement cell.</Text>
          ) : (
            <>
              <Controller
                control={control}
                name="subject"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.field}>
                    <Text style={styles.label}>Subject</Text>
                    <TextInput mode="outlined" value={value} onChangeText={onChange} onBlur={onBlur} maxLength={120} error={!!errors.subject} style={styles.input} outlineColor={C.line} activeOutlineColor={C.accent} outlineStyle={styles.outline} />
                    {errors.subject ? <Text style={styles.errorText}>{errors.subject.message}</Text> : null}
                  </View>
                )}
              />
              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.field}>
                    <Text style={styles.label}>Message</Text>
                    <TextInput mode="outlined" multiline numberOfLines={5} value={value} onChangeText={onChange} onBlur={onBlur} maxLength={2000} error={!!errors.message} style={styles.input} outlineColor={C.line} activeOutlineColor={C.accent} outlineStyle={styles.outline} />
                    {errors.message ? <Text style={styles.errorText}>{errors.message.message}</Text> : null}
                  </View>
                )}
              />
              <Button
                mode="contained"
                icon="send"
                loading={sending}
                disabled={sending}
                onPress={handleSubmit(submit, () => showAlert('Check your message', 'Fill in the subject and message, then send again.'))}
                buttonColor={C.accent}
                textColor="#FFFFFF"
                style={styles.send}
                contentStyle={styles.sendContent}
              >
                Send to placement cell
              </Button>
            </>
          )}
        </Card>

        <Text style={[styles.legalLinks, styles.column]}>
          <Text style={styles.legalLink} onPress={() => router.push('/legal?tab=terms' as any)} accessibilityRole="link">
            Terms of Use
          </Text>
          {'  ·  '}
          <Text style={styles.legalLink} onPress={() => router.push('/legal?tab=privacy' as any)} accessibilityRole="link">
            Privacy Policy
          </Text>
        </Text>

        {user && tickets && tickets.length > 0 ? (
          <Card style={styles.column}>
            <Text style={styles.cardTitle}>Your recent queries</Text>
            {tickets.map((t) => (
              <View key={t.id} style={styles.ticket}>
                <View style={styles.ticketHead}>
                  <Text style={styles.ticketSubject} numberOfLines={2}>{t.subject}</Text>
                  <StatusChip label={t.status === 'resolved' ? 'Resolved' : 'Open'} tone={t.status === 'resolved' ? 'success' : 'warning'} />
                </View>
                <Text style={styles.ticketDate}>{formatDateTime(t.created_at)}</Text>
                {t.admin_reply ? (
                  <View style={styles.reply}>
                    <Text style={styles.replyLabel}>REPLY FROM THE PLACEMENT CELL</Text>
                    <Text style={styles.replyText} selectable>{t.admin_reply}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  plainHeader: { paddingHorizontal: 8, paddingTop: 12, alignItems: 'flex-start' },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  heading: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.muted, marginTop: 2, lineHeight: 22 },
  legalLinks: { fontSize: 14, color: C.muted, textAlign: 'center' },
  legalLink: { color: C.accent, fontWeight: '600', textDecorationLine: 'underline' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 },
  faq: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12, minHeight: 44 },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  faqQ: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: C.ink, lineHeight: 21 },
  faqA: { fontSize: 14, color: C.muted, lineHeight: 21, marginTop: 8 },
  field: { marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 6 },
  input: { backgroundColor: C.card, fontSize: 16 },
  outline: { borderRadius: 10, borderWidth: 1 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 2 },
  send: { borderRadius: 10, marginTop: 16 },
  sendContent: { minHeight: 48 },
  ticket: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12, gap: 4 },
  ticketHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  ticketSubject: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: C.ink },
  ticketDate: { fontSize: 12, color: C.muted },
  reply: { marginTop: 6, backgroundColor: C.successSoft, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, gap: 2 },
  replyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: C.success },
  replyText: { fontSize: 14, color: C.ink, lineHeight: 20 },
});
