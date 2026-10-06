import { PartnerMarquee } from "@/components/PartnerMarquee";
import { useAuthStore } from "@/store/authStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
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
  success: "#12A150",
};

const LOGO_RATIO = 259 / 217; // logo width / height

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

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: "95%+", label: "Placement Rate" },
  { value: "500+", label: "Verified Partners" },
  { value: "Live", label: "Drive Tracking" },
];

const FEATURES = [
  {
    title: "Real-Time Pipeline",
    desc: "Track application stages instantly from shortlisting to final offer letter.",
    icon: "chart-timeline-variant" as const,
  },
  {
    title: "Vetted Corporate Network",
    desc: "Strictly screened recruiters ensuring transparent, authentic, and high-paying roles.",
    icon: "shield-check-outline" as const,
  },
  {
    title: "Role-Based Workspaces",
    desc: "Dedicated secure dashboards tailored specifically for students, admins, and HR.",
    icon: "account-group-outline" as const,
  },
];

type StepState = "done" | "active" | "pending";
const PIPELINE: { label: string; meta: string; state: StepState }[] = [
  { label: "Applied", meta: "Profile verified", state: "done" },
  { label: "Shortlisted", meta: "Round 1 cleared", state: "done" },
  { label: "Technical Interview", meta: "Scheduled today", state: "active" },
  { label: "Offer Letter", meta: "Awaiting result", state: "pending" },
];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */
function Brand({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.brand}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={{ height: size, width: size * LOGO_RATIO }}
        resizeMode="contain"
      />
      <Text style={styles.brandText}>Adhyay</Text>
    </View>
  );
}

function PipelineCard({ compact }: { compact: boolean }) {
  const pad = compact ? 16 : 22;
  return (
    <View style={styles.pipelineCard}>
      <View style={[styles.pipelineHeader, { padding: pad }]}>
        <View style={styles.pipelineHeaderText}>
          <Text style={styles.pipelineKicker}>DRIVE TRACKING</Text>
          <Text style={styles.pipelineTitle} numberOfLines={1}>
            Software Engineer · Sample
          </Text>
        </View>
        <View style={styles.livePill}>
          <MotiView
            from={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.1 }}
            transition={{
              type: "timing",
              duration: 900,
              loop: true,
              repeatReverse: true,
            }}
            style={styles.liveDot}
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={{ padding: pad, paddingBottom: pad - 8 }}>
        {PIPELINE.map((step, i) => {
          const last = i === PIPELINE.length - 1;
          return (
            <MotiView
              key={step.label}
              from={{ opacity: 0, translateX: 16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: "timing",
                duration: 500,
                delay: 400 + i * 120,
              }}
              style={styles.stepRow}
            >
              <View style={styles.stepRail}>
                <View
                  style={[
                    styles.stepCircle,
                    step.state === "done" && styles.stepCircleDone,
                    step.state === "active" && styles.stepCircleActive,
                  ]}
                >
                  {step.state === "done" && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color="#fff"
                    />
                  )}
                  {step.state === "active" && <View style={styles.stepInner} />}
                </View>
                {!last && (
                  <View
                    style={[
                      styles.stepLine,
                      step.state === "done" && { backgroundColor: C.accent },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepLabel,
                    step.state === "pending" && { color: C.faint },
                  ]}
                >
                  {step.label}
                </Text>
                <Text style={styles.stepMeta}>{step.meta}</Text>
              </View>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */
function LandingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isSmall = width < 380; // small phones
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const gutter = isSmall ? 16 : isMobile ? 20 : isDesktop ? 56 : 32;
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  const goLogin = () => router.push("/(auth)/login" as any);
  const goSignup = () => router.push("/(auth)/signup" as any);

  return (
    <View style={styles.container}>
      {/* Ambient shapes */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      {/* NAV: brand + the single "existing user" action */}
      <View
        style={[
          styles.nav,
          { paddingHorizontal: gutter, paddingTop: topInset },
        ]}
      >
        <View style={[styles.navInner, { height: isMobile ? 60 : 72 }]}>
          <Brand size={isMobile ? 32 : 40} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={goLogin}
            style={styles.navSignIn}
          >
            <MaterialCommunityIcons
              name="login-variant"
              size={16}
              color={C.ink}
            />
            <Text style={styles.navSignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollLayout,
          {
            paddingHorizontal: gutter,
            paddingTop: isMobile ? 28 : 56,
            paddingBottom: 40 + bottomInset,
            gap: isMobile ? 48 : 88,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO */}
        <View
          style={[
            styles.heroRow,
            {
              flexDirection: isDesktop ? "row" : "column",
              gap: isDesktop ? 56 : 36,
            },
          ]}
        >
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 700 }}
            style={[
              styles.heroLeft,
              isDesktop && { flex: 1.1, alignItems: "flex-start" },
              !isDesktop && { alignItems: "center" },
            ]}
          >
            <View style={styles.heroBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.heroBadgeText} numberOfLines={1}>
                Campus Recruitment Management
              </Text>
            </View>

            <Text
              style={[
                styles.mainTitle,
                {
                  fontSize: isSmall ? 36 : isMobile ? 44 : isTablet ? 62 : 72,
                  lineHeight: isSmall ? 42 : isMobile ? 50 : isTablet ? 68 : 78,
                  letterSpacing: isMobile ? -1.5 : -2.5,
                  textAlign: isDesktop ? "left" : "center",
                },
              ]}
            >
              Start your{"\n"}
              <Text style={styles.titleAccent}>chapter.</Text>
            </Text>

            <Text
              style={[
                styles.subTitle,
                {
                  fontSize: isMobile ? 16 : 18,
                  lineHeight: isMobile ? 25 : 29,
                  textAlign: isDesktop ? "left" : "center",
                  maxWidth: isDesktop ? 520 : 560,
                },
              ]}
            >
              Welcome to Adhyay — the premier infrastructure bridging university
              talent with enterprise hiring teams.
            </Text>

            {/* Single primary action in the hero */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btnInk, isMobile && styles.btnFull]}
              onPress={goSignup}
            >
              <Text style={styles.btnInkText}>Create Account</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 32 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800, delay: 200 }}
            style={[
              styles.heroRight,
              isDesktop ? { flex: 0.9 } : { width: "100%", maxWidth: 520 },
            ]}
          >
            <PipelineCard compact={isSmall} />
          </MotiView>
        </View>

        {/* 2. STATS (always a row so it never collapses on phones) */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 250 }}
          style={styles.statsBand}
        >
          {STATS.map((stat, i) => (
            <View
              key={stat.label}
              style={[
                styles.statItem,
                {
                  paddingVertical: isMobile ? 20 : 36,
                  paddingHorizontal: isMobile ? 6 : 16,
                },
                i !== STATS.length - 1 && {
                  borderRightWidth: 1,
                  borderRightColor: C.inkSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { fontSize: isSmall ? 22 : isMobile ? 26 : 44 },
                ]}
              >
                {stat.value}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    fontSize: isMobile ? 9.5 : 12,
                    letterSpacing: isMobile ? 0.6 : 1.2,
                  },
                ]}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </MotiView>

        {/* 3. FEATURES */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 300 }}
          style={styles.section}
        >
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.eyebrow}>WHAT'S INSIDE</Text>
            <Text
              style={[
                styles.sectionTitle,
                { fontSize: isSmall ? 24 : isMobile ? 28 : 38 },
              ]}
            >
              Enterprise-Grade Features
            </Text>
            <Text style={styles.sectionSub}>
              Everything you need to streamline the hiring cycle.
            </Text>
          </View>

          <View
            style={[
              styles.featuresGrid,
              {
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 14 : 20,
              },
            ]}
          >
            {FEATURES.map((feature, i) => (
              <View
                key={feature.title}
                style={[
                  styles.featureCard,
                  isMobile
                    ? { width: "100%", padding: 22 }
                    : { flex: 1, padding: isTablet ? 22 : 28 },
                ]}
              >
                <View style={styles.featureTop}>
                  <View style={styles.featureIconWrap}>
                    <MaterialCommunityIcons
                      name={feature.icon}
                      size={26}
                      color={C.accent}
                    />
                  </View>
                  <Text style={styles.featureNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </MotiView>

        {/* 4. PARTNERS */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 700, delay: 350 }}
          style={styles.section}
        >
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.eyebrow}>OUR NETWORK</Text>
            <Text
              style={[
                styles.sectionTitle,
                { fontSize: isSmall ? 22 : isMobile ? 26 : 32 },
              ]}
            >
              Trusted by Top Companies
            </Text>
          </View>
          <View style={styles.marqueeContainer}>
            <PartnerMarquee />
          </View>
        </MotiView>

        {/* 5. CALL TO ACTION: one button, plus a quiet sign-in link */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 400 }}
          style={styles.ctaSection}
        >
          <View
            style={[
              styles.ctaCard,
              { padding: isSmall ? 24 : isMobile ? 28 : isTablet ? 48 : 64 },
            ]}
          >
            <View style={styles.ctaGlow} />
            <Text style={styles.ctaEyebrow}>NEXT CHAPTER</Text>
            <Text
              style={[
                styles.ctaTitle,
                { fontSize: isSmall ? 26 : isMobile ? 30 : 44 },
              ]}
            >
              Ready to begin?
            </Text>
            <Text style={styles.ctaDesc}>
              Access company drives, manage interview invites, or review
              candidate profiles in your secure workspace.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.btnPrimary, isMobile && styles.btnFull]}
              onPress={goSignup}
            >
              <Text style={styles.btnPrimaryText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={goLogin}>
              <Text style={styles.ctaLinkText}>
                Already have an account?{" "}
                <Text style={styles.ctaLinkStrong}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* 6. FOOTER */}
        <View
          style={[
            styles.footer,
            {
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 12 : 0,
            },
          ]}
        >
          <Brand size={26} />
          <Text style={styles.footerText}>
            © Adhyay • Developed for excellence.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function IndexPage() {
  const router = useRouter();
  const { session, role, loading } = useAuthStore();

  useEffect(() => {
    if (loading || !session) return;
    if (role) {
      if (role === "student") {
        router.replace("/(student)/dashboard" as any);
      } else if (role === "company") {
        router.replace("/(company)/dashboard" as any);
      } else if (role === "admin") {
        router.replace("/(admin)/dashboard" as any);
      }
    } else {
      supabase.auth.signOut().then(() => {
        router.replace("/(auth)/login" as any);
      });
    }
  }, [session, role, loading, router]);

  if (loading || session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Authenticating workspace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <LandingPage />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  container: {
    flex: 1,
    backgroundColor: C.paper,
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.paper,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { fontSize: 14, color: C.muted, fontWeight: "500" },

  /* Ambient */
  ambientTop: {
    position: "absolute",
    top: -220,
    right: -160,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: "rgba(31, 91, 255, 0.07)",
  },
  ambientBottom: {
    position: "absolute",
    bottom: -240,
    left: -180,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "rgba(245, 181, 68, 0.10)",
  },

  /* Nav */
  nav: {
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    zIndex: 10,
  },
  navInner: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.5,
  },
  navSignIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  navSignInText: { fontSize: 14, fontWeight: "700", color: C.ink },

  /* Layout */
  scroll: { flex: 1 },
  scrollLayout: {
    maxWidth: 1312,
    width: "100%",
    alignSelf: "center",
  },

  /* Hero */
  heroRow: { alignItems: "center", width: "100%" },
  heroLeft: { gap: 22, width: "100%" },
  heroRight: { alignItems: "center", justifyContent: "center" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: C.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    gap: 8,
    maxWidth: "100%",
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  heroBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  mainTitle: { fontWeight: "800", color: C.ink },
  titleAccent: { color: C.accent },
  subTitle: { color: C.muted },
  btnFull: { width: "100%" },
  btnInk: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
    ...shadow(8, 20, 0.18),
  },
  btnInkText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  /* Pipeline card */
  pipelineCard: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
    ...shadow(20, 40, 0.1),
  },
  pipelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: "#FBFAF7",
  },
  pipelineHeaderText: { flex: 1, minWidth: 0 },
  pipelineKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.faint,
  },
  pipelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
    marginTop: 4,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E7F6EE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.success,
    letterSpacing: 0.8,
  },
  stepRow: { flexDirection: "row", gap: 14, minHeight: 60 },
  stepRail: { alignItems: "center", width: 28 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: { backgroundColor: C.accent, borderColor: C.accent },
  stepCircleActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  stepInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.accent,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.line,
    marginVertical: 4,
  },
  stepText: { flex: 1, paddingTop: 2 },
  stepLabel: { fontSize: 15, fontWeight: "700", color: C.ink },
  stepMeta: { fontSize: 13, color: C.muted, marginTop: 2 },

  /* Stats */
  statsBand: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: C.ink,
    borderRadius: 24,
    overflow: "hidden",
    ...shadow(14, 36, 0.14),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statValue: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  statLabel: {
    fontWeight: "700",
    color: C.amber,
    textTransform: "uppercase",
    textAlign: "center",
  },

  /* Sections */
  section: { gap: 28, width: "100%" },
  sectionHeaderWrap: { alignItems: "center", gap: 10 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: C.accent,
  },
  sectionTitle: {
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -1,
    textAlign: "center",
  },
  sectionSub: {
    fontSize: 16,
    color: C.muted,
    textAlign: "center",
    maxWidth: 480,
  },

  /* Features */
  featuresGrid: { width: "100%" },
  featureCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    gap: 24,
    ...shadow(6, 20, 0.04),
  },
  featureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureNumber: {
    fontSize: 40,
    fontWeight: "800",
    color: "#EAE6DC",
    letterSpacing: -2,
  },
  featureTextWrap: { gap: 8 },
  featureTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.3,
  },
  featureDesc: { fontSize: 15, color: C.muted, lineHeight: 23 },

  /* Marquee */
  marqueeContainer: {
    width: "100%",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    paddingVertical: 22,
    overflow: "hidden",
  },

  /* CTA */
  ctaSection: { width: "100%" },
  ctaCard: {
    width: "100%",
    backgroundColor: C.ink,
    borderRadius: 28,
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
    ...shadow(18, 38, 0.18),
  },
  ctaGlow: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(31, 91, 255, 0.32)",
  },
  ctaEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: C.amber,
  },
  ctaTitle: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    textAlign: "center",
  },
  ctaDesc: {
    fontSize: 16,
    color: "#A7AEC0",
    textAlign: "center",
    lineHeight: 25,
    maxWidth: 500,
    marginBottom: 6,
  },
  btnPrimary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: C.ink },
  ctaLinkText: { fontSize: 14, color: "#A7AEC0", textAlign: "center" },
  ctaLinkStrong: {
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  /* Footer */
  footer: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.line,
    width: "100%",
  },
  footerText: { fontSize: 14, color: C.faint, fontWeight: "500" },
});
