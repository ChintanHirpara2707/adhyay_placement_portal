import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C, shadow } from '@/theme/design';
import { useBreakpoint } from './useBreakpoint';
import { Brand } from './Brand';
import { AnimatedToast, ToastType } from '@/components/AnimatedToast';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  toast: { visible: boolean; message: string; type: ToastType };
  onDismissToast: () => void;
}

const BENEFITS = [
  { icon: 'radar' as const, text: 'Live drives matched to your profile' },
  { icon: 'shield-check-outline' as const, text: 'Verified companies, approved by your cell' },
  { icon: 'lock-outline' as const, text: 'Role-based access for students & recruiters' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, toast, onDismissToast }) => {
  const insets = useSafeAreaInsets();
  const { isDesktop, isMobile, isSmall } = useBreakpoint();
  const padTop = Platform.OS === 'web' ? 0 : insets.top;
  const padBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  const cardPadding = isSmall ? 20 : !isDesktop ? 24 : 36;

  const form = (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
      style={[styles.cardWrap, !isDesktop && styles.cardWrapMobile]}
    >
      <View style={[styles.card, { padding: cardPadding }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.fields}>{children}</View>
      </View>
      <Text style={styles.foot}>Built for students, companies, and placement cells.</Text>
    </MotiView>
  );

  return (
    <View style={[styles.root, { paddingTop: padTop, paddingBottom: padBottom }]}>
      <AnimatedToast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={onDismissToast} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {isDesktop ? (
          <View style={styles.split}>
            <View style={styles.panel}>
              <Brand size={44} sub="Placement Portal" />
              <Text style={styles.panelTitle}>Start your chapter.</Text>
              <View style={styles.benefits}>
                {BENEFITS.map((b, i) => (
                  <MotiView
                    key={b.text}
                    from={{ opacity: 0, translateY: 16 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 150 + i * 100 }}
                    style={styles.benefit}
                  >
                    <MaterialCommunityIcons name={b.icon} size={20} color={C.accent} />
                    <Text style={styles.benefitText}>{b.text}</Text>
                  </MotiView>
                ))}
              </View>
              <Text style={styles.panelFoot}>ADHYAY · CAMPUS PLACEMENT</Text>
            </View>
            <View style={styles.formSide}>{form}</View>
          </View>
        ) : (
          <View style={styles.single}>
            <Brand size={isMobile ? 40 : 44} sub="Placement Portal" />
            {form}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  split: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1020,
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    ...shadow(2, 8, 0.05),
  },
  panel: {
    flex: 1,
    backgroundColor: C.surface,
    borderRightWidth: 1,
    borderRightColor: C.line,
    padding: 44,
    gap: 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  panelTitle: { fontSize: 32, fontWeight: '700', color: C.ink, letterSpacing: -0.8, marginTop: 8 },
  benefits: { gap: 14, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 15, color: C.inkSoft, lineHeight: 22, flexShrink: 1 },
  panelFoot: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.muted, marginTop: 12 },
  formSide: { flex: 1, justifyContent: 'center', padding: 12 },
  single: { width: '100%', maxWidth: 460, alignSelf: 'center', alignItems: 'center', gap: 18 },
  cardWrap: { width: '100%' },
  cardWrapMobile: { maxWidth: 460, alignSelf: 'center' },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, ...shadow(1, 4, 0.04) },
  title: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 15, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  fields: { marginTop: 20, gap: 2 },
  foot: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 14 },
});
