import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C, R, shadow } from '@/theme/design';
import { useBreakpoint } from './useBreakpoint';

export const Card: React.FC<{ children: React.ReactNode; testID?: string; style?: any }> = ({ children, testID, style }) => (
  <View style={[styles.card, style]} testID={testID}>
    {children}
  </View>
);

export const SectionHeader: React.FC<{ eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }> = ({
  eyebrow,
  title,
  subtitle,
  action,
}) => (
  <View style={styles.head}>
    <View style={styles.headText}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'ink' | 'accent' | 'success' | 'warning' | 'danger' | 'teal';
  sub?: string;
  index?: string;
}> = ({ label, value, icon, tone = 'accent', sub, index }) => {
  const tones = {
    ink: { bg: C.ink, fg: '#FFFFFF', soft: '#E8EAF0' },
    accent: { bg: C.accentSoft, fg: C.accent, soft: C.accentSoft },
    success: { bg: C.successSoft, fg: C.success, soft: C.successSoft },
    warning: { bg: C.warningSoft, fg: C.warning, soft: C.warningSoft },
    danger: { bg: C.dangerSoft, fg: C.danger, soft: C.dangerSoft },
    teal: { bg: C.tealSoft, fg: C.teal, soft: C.tealSoft },
  }[tone];
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: tones.bg }]}>
          <MaterialCommunityIcons name={icon} size={20} color={tones.fg} />
        </View>
        {index ? <Text style={styles.statIndex}>{index}</Text> : null}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
};

const CHIP_TONES: Record<string, { bg: string; fg: string }> = {
  success: { bg: C.successSoft, fg: C.success },
  warning: { bg: C.warningSoft, fg: C.warning },
  danger: { bg: C.dangerSoft, fg: C.danger },
  accent: { bg: C.accentSoft, fg: C.accent },
  teal: { bg: C.tealSoft, fg: C.teal },
  muted: { bg: '#EEF0F4', fg: C.muted },
};

export const StatusChip: React.FC<{ label: string; tone?: keyof typeof CHIP_TONES }> = ({ label, tone = 'muted' }) => {
  const t = CHIP_TONES[tone] ?? CHIP_TONES.muted;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.chipText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

export const statusToneFor = (status: string): 'success' | 'warning' | 'danger' | 'accent' | 'teal' | 'muted' => {
  const s = status.toLowerCase();
  if (['approved', 'selected', 'offered', 'placed'].includes(s)) return 'success';
  if (['pending', 'applied', 'in review', 'in_review'].includes(s)) return 'warning';
  if (['rejected', 'failed', 'closed'].includes(s)) return 'danger';
  if (['scheduled', 'shortlisted', 'interview_scheduled', 'open'].includes(s)) return 'accent';
  if (['round_cleared', 'cleared'].includes(s)) return 'teal';
  return 'muted';
};

export const EmptyState: React.FC<{ icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  hint,
  action,
}) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <MaterialCommunityIcons name={icon} size={28} color={C.faint} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    {action}
  </View>
);

export const ListRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.row}>{children}</View>
);

export const ResponsiveGrid: React.FC<{ children: React.ReactNode; minItemWidth?: number }> = ({ children, minItemWidth = 160 }) => {
  const { width, isSmall } = useBreakpoint();
  const cols = width < 340 ? 1 : width < 768 ? 2 : 4;
  const count = React.Children.count(children);
  const perRow = Math.min(cols, count);
  const gap = 12;
  const basis = `${Math.floor(100 / perRow)}%`;
  return (
    <View style={[styles.grid, { gap }]}>
      {React.Children.map(children, (c) => (
        <View style={{ width: isSmall && perRow === 1 ? '100%' : undefined, flexGrow: 1, flexBasis: isSmall && perRow === 1 ? '100%' : (basis as any), minWidth: isSmall ? 0 : minItemWidth }}>{c}</View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 20, ...shadow(8, 20, 0.06) },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  headText: { flex: 1, minWidth: 0, flexShrink: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: C.accent },
  title: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.5, marginTop: 4 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 21 },
  action: { flexShrink: 0 },
  stat: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 2, ...shadow(8, 20, 0.06) },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statIndex: { fontSize: 12, fontWeight: '800', color: C.faint, letterSpacing: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.8 },
  statLabel: { fontSize: 13, fontWeight: '700', color: C.ink },
  statSub: { fontSize: 12, color: C.muted },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0EFE9', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  emptyHint: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
  row: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
