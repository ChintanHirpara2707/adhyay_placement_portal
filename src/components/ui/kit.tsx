import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C, R, shadow } from '@/theme/design';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const Card: React.FC<{ children: React.ReactNode; testID?: string; style?: StyleProp<ViewStyle> }> = ({
  children,
  testID,
  style,
}) => (
  <View style={[styles.card, style]} testID={testID}>
    {children}
  </View>
);

/** Soft-gray secondary surface used for hero / summary panels. */
export const Panel: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.panel, style]}>{children}</View>
);

/** Width-constrained, centered column style for screens that render their own list (FlatList etc.). */
export const pageColumn = (maxWidth = 720): ViewStyle => ({
  width: '100%',
  maxWidth,
  alignSelf: 'center',
  paddingHorizontal: 16,
});

/** Page title block shown at the top of a screen, aligned with the content column. */
export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; maxWidth?: number }> = ({
  title,
  subtitle,
  action,
  maxWidth = 720,
}) => (
  <View style={[pageColumn(maxWidth), styles.pageHeader]}>
    <View style={styles.headText}>
      <Text style={styles.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

/** Single-select filter pills. Touch-friendly (44px), scrolls horizontally when it overflows. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  maxWidth = 720,
  wrap = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  maxWidth?: number;
  /** Wrap onto multiple lines instead of scrolling horizontally (use inside cards). */
  wrap?: boolean;
}) {
  const Container: React.ElementType = wrap ? View : ScrollView;
  const containerProps = wrap
    ? { style: styles.chipWrap }
    : { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.chipRow, keyboardShouldPersistTaps: 'handled' };
  return (
    <View style={wrap ? undefined : [pageColumn(maxWidth), { paddingHorizontal: 0 }]}>
      <Container {...containerProps}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${o.label}`}
              style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </Container>
    </View>
  );
}

export const SectionHeader: React.FC<{ eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }> = ({
  eyebrow,
  title,
  subtitle,
  action,
}) => (
  <View style={styles.head}>
    <View style={styles.headText}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

const TONES = {
  ink: { bg: C.soft, fg: C.ink },
  accent: { bg: C.accentSoft, fg: C.accent },
  success: { bg: C.successSoft, fg: C.success },
  warning: { bg: C.warningSoft, fg: C.warning },
  danger: { bg: C.dangerSoft, fg: C.danger },
  teal: { bg: C.tealSoft, fg: C.teal },
  muted: { bg: C.soft, fg: C.muted },
} as const;

export type Tone = keyof typeof TONES;

export const StatusChip: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = 'muted' }) => {
  const t = TONES[tone] ?? TONES.muted;
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

export const EmptyState: React.FC<{ icon: IconName; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  hint,
  action,
}) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <MaterialCommunityIcons name={icon} size={26} color={C.muted} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    {action}
  </View>
);

export const ErrorState: React.FC<{ title?: string; hint?: string; action?: React.ReactNode }> = ({
  title = 'Something went wrong',
  hint,
  action,
}) => (
  <View style={styles.empty}>
    <View style={[styles.emptyIcon, { backgroundColor: C.dangerSoft }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={26} color={C.danger} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    {action}
  </View>
);

export const ListRow: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    ...shadow(1, 3, 0.04),
  },
  panel: {
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
    gap: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  filterChipText: { fontSize: 13, fontWeight: '500', color: C.inkSoft },
  filterChipTextActive: { color: C.accentStrong, fontWeight: '600' },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  headText: { flex: 1, minWidth: 0, flexShrink: 1 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted },
  title: { fontSize: 18, fontWeight: '700', color: C.ink, letterSpacing: -0.2, marginTop: 2 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 20 },
  action: { flexShrink: 0, minHeight: 44, justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 6 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.ink, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, maxWidth: 360 },
  row: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 14, gap: 6 },
});
