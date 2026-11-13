import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/AppButton';
import { pageColumn } from '@/components/ui/kit';
import { C } from '@/theme/design';

const LAST_UPDATED = '13 November 2026';

interface Section {
  title: string;
  body: string[];
}

const TERMS: Section[] = [
  {
    title: '1. About the portal',
    body: [
      'The Adhyay Placement Portal ("the portal") is run by the college placement cell to manage campus recruitment: students register for drives, companies post drives and run interview rounds, and the placement cell oversees the process.',
      'By creating an account or using the portal you agree to these Terms of Use. If you do not agree, please do not use the portal.',
    ],
  },
  {
    title: '2. Accounts',
    body: [
      'Students and companies create their own accounts. Admin accounts are created only by the placement cell.',
      'You must give accurate information and keep it up to date. You are responsible for keeping your password safe and for everything done through your account.',
      'Company accounts must be approved by the placement cell before they can post drives. The placement cell may decline an application and will give a reason.',
    ],
  },
  {
    title: '3. What you agree to do',
    body: [
      'Students: provide truthful academic details (branch, CGPA, backlogs), upload only your own resume, register only for drives you intend to attend, and answer offers honestly. Withdraw a registration if you can no longer attend.',
      'Companies: post genuine drives with accurate eligibility, pay and location, treat candidates fairly, and use candidate information only for recruitment.',
      'Everyone: do not misuse the portal, attempt to access other people\'s data, upload harmful files, or send abusive or misleading messages.',
    ],
  },
  {
    title: '4. Drives, interviews and offers',
    body: [
      'Eligibility is decided from the details you provide. Registration does not guarantee a shortlist, an interview or a job.',
      'Interview dates, times and notes are set by companies and may be rescheduled or cancelled; you will be notified in the portal.',
      'An offer can be accepted or declined once. Your answer is shared with the company and the placement cell.',
    ],
  },
  {
    title: '5. Action by the placement cell',
    body: [
      'To protect students and companies, the placement cell may debar or remove an account that breaks these terms or the college\'s placement rules. A reason is recorded and shown to the affected user, and the action is logged.',
      'Removing an account permanently deletes its data in the portal.',
    ],
  },
  {
    title: '6. Your content',
    body: [
      'You keep ownership of what you upload (such as your resume or company logo). You allow the portal to store it and show it to the people who need it to run recruitment, as described in the Privacy Policy.',
    ],
  },
  {
    title: '7. Availability and changes',
    body: [
      'We work to keep the portal available but cannot promise it will always be uninterrupted or error-free. Features may change over time.',
      'We may update these terms. The date at the top shows the latest version; continuing to use the portal after a change means you accept it.',
    ],
  },
  {
    title: '8. Contact',
    body: ['Questions about these terms? Use "Help & support" in the portal to message the placement cell.'],
  },
];

const PRIVACY: Section[] = [
  {
    title: '1. What we collect',
    body: [
      'Account: your email address and role (student, company or admin).',
      'Students: name, branch, CGPA, backlogs, phone number, skills, your resume (PDF) and the details you enter for applications.',
      'Companies: company name, description, website, logo and the drives you post.',
      'Activity: applications, interview schedules and notes, offer responses, notifications, saved or hidden drives, and messages you send to the placement cell.',
      'When you accept these terms we also record the time you did so.',
    ],
  },
  {
    title: '2. Why we use it',
    body: [
      'To run campus recruitment: show you drives you are eligible for, let companies review applicants, schedule interviews, record results and send you notifications and deadline reminders.',
      'To let the placement cell approve companies, answer questions, produce placement statistics and keep the process fair.',
    ],
  },
  {
    title: '3. Who can see it',
    body: [
      'The placement cell can see all records.',
      'A company can see the profile and resume of students who registered for that company\'s drives, and nothing about students who did not.',
      'Other students cannot see your profile, applications or resume. Company logos and drive details are visible to eligible students.',
      'We do not sell your data or use it for advertising.',
    ],
  },
  {
    title: '4. Where it is stored and how it is protected',
    body: [
      'Data is stored with our cloud database and file-storage provider (Supabase). Access is controlled by per-user rules so each role can only read what it needs.',
      'Resumes are kept in a private store and opened through short-lived links. Passwords are handled by the authentication service and are never visible to us.',
    ],
  },
  {
    title: '5. How long we keep it',
    body: [
      'We keep your data while your account is active. When the placement cell removes an account, its profile, applications, interviews, notifications and files are deleted. Records of debarment actions may be kept for the placement cell\'s audit trail.',
    ],
  },
  {
    title: '6. Your choices',
    body: [
      'You can update your profile and replace or remove your resume or logo at any time.',
      'To correct data you cannot change yourself, or to ask for your account to be removed, message the placement cell through "Help & support".',
    ],
  },
  {
    title: '7. Local storage',
    body: ['The portal stores a sign-in session on your device (and in the browser on the web) so you stay signed in. It does not use advertising trackers.'],
  },
  {
    title: '8. Changes and contact',
    body: [
      'If this policy changes, the date at the top will be updated. For privacy questions use "Help & support" in the portal.',
    ],
  },
];

export default function LegalScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [view, setView] = useState<'terms' | 'privacy'>(tab === 'privacy' ? 'privacy' : 'terms');
  const sections = view === 'terms' ? TERMS : PRIVACY;

  return (
    <View style={styles.page}>
      <View style={styles.bar}>
        <Button mode="text" icon="arrow-left" onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))} textColor={C.accent}>
          Back
        </Button>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {view === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
        </Text>
        <Text style={styles.updated}>Adhyay Placement Portal · Last updated {LAST_UPDATED}</Text>
        <SegmentedButtons
          value={view}
          onValueChange={(v) => setView(v as 'terms' | 'privacy')}
          buttons={[
            { value: 'terms', label: 'Terms of Use', checkedColor: C.accentStrong, uncheckedColor: C.muted },
            { value: 'privacy', label: 'Privacy Policy', checkedColor: C.accentStrong, uncheckedColor: C.muted },
          ]}
          style={styles.segments}
        />
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  bar: { ...pageColumn(720), paddingTop: 12, alignItems: 'flex-start' },
  body: { ...pageColumn(720), paddingTop: 4, paddingBottom: 48, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -0.6 },
  updated: { fontSize: 13, color: C.muted },
  segments: { backgroundColor: C.surface, borderRadius: 10 },
  section: { gap: 6, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  para: { fontSize: 15, lineHeight: 24, color: C.inkSoft },
});
