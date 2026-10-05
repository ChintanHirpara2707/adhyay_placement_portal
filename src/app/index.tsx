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
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const C = {
  ink: "#0B1020",
  inkSoft: "#1A2036",
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

const LOGO_RATIO = 259 / 217; // width / height of the supplied logo

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
        style={{ height: size, aspectRatio: LOGO_RATIO }}
        resizeMode="contain"
      />
      <Text style={styles.brandText}>Adhyay</Text>
    </View>
  );
}

function PipelineCard() {
  return (
    <View style={styles.pipelineCard}>
      <View style={styles.pipelineHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pipelineKicker}>DRIVE TRACKING</Text>
          <Text style={styles.pipelineTitle}>Software Engineer · Sample</Text>
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

      <View style={styles.pipelineBody}>
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
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const gutter = isMobile ? 20 : isDesktop ? 56 : 32;
  const goLogin = () => router.push("/(auth)/login" as any);
  const goSignup = () => router.push("/(auth)/signup" as any);

  return (
    <View style={styles.container}>
      {/* Ambient shapes */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      {/* NAV */}
      <View style={[styles.nav, { paddingHorizontal: gutter }]}>
        <View style={styles.navInner}>
          <Brand size={isMobile ? 34 : 40} />
          <View style={styles.navActions}>
            {!isMobile && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={goLogin}
                style={styles.navLink}
              >
                <Text style={styles.navLinkText}>Sign In</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={isMobile ? goLogin : goSignup}
              style={styles.navCta}
            >
              <Text style={styles.navCtaText}>
                {isMobile ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollLayout,
          {
            paddingHorizontal: gutter,
            paddingTop: isMobile ? 32 : 56,
            gap: isMobile ? 56 : 88,
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
              gap: isDesktop ? 56 : 40,
            },
          ]}
        >
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 700 }}
            style={[
              styles.heroLeft,
              {
                flex: isDesktop ? 1.1 : undefined,
                alignItems: isDesktop ? "flex-start" : "center",
              },
            ]}
          >
            <View style={styles.heroBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.heroBadgeText}>
                Campus Recruitment Management
              </Text>
            </View>

            <Text
              style={[
                styles.mainTitle,
                {
                  fontSize: isMobile ? 42 : isTablet ? 60 : 70,
                  lineHeight: isMobile ? 48 : isTablet ? 66 : 76,
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
                  lineHeight: isMobile ? 26 : 29,
                  textAlign: isDesktop ? "left" : "center",
                  maxWidth: isDesktop ? 520 : 600,
                },
              ]}
            >
              Welcome to Adhyay — the premier infrastructure bridging university
              talent with enterprise hiring teams.
            </Text>

            <View
              style={[
                styles.heroButtons,
                {
                  flexDirection: isMobile ? "column" : "row",
                  width: isMobile ? "100%" : "auto",
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.btnInk, isMobile && { width: "100%" }]}
                onPress={goSignup}
              >
                <Text style={styles.btnInkText}>Create Account</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.btnOutline, isMobile && { width: "100%" }]}
                onPress={goLogin}
              >
                <Text style={styles.btnOutlineText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 32 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800, delay: 200 }}
            style={[
              styles.heroRight,
              {
                flex: isDesktop ? 0.9 : undefined,
                width: "100%",
                maxWidth: isDesktop ? undefined : 520,
              },
            ]}
          >
            <View style={styles.heroGlow} />
            <PipelineCard />
          </MotiView>
        </View>

        {/* 2. STATS */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 250 }}
          style={[
            styles.statsBand,
            { flexDirection: isMobile ? "column" : "row" },
          ]}
        >
          {STATS.map((stat, i) => {
            const last = i === STATS.length - 1;
            return (
              <View
                key={stat.label}
                style={[
                  styles.statItem,
                  { paddingVertical: isMobile ? 22 : 36 },
                  !last &&
                    (isMobile
                      ? { borderBottomWidth: 1, borderBottomColor: C.inkSoft }
                      : { borderRightWidth: 1, borderRightColor: C.inkSoft }),
                ]}
              >
                <Text
                  style={[styles.statValue, { fontSize: isMobile ? 34 : 44 }]}
                >
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            );
          })}
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
              style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 38 }]}
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
                gap: isMobile ? 16 : 20,
              },
            ]}
          >
            {FEATURES.map((feature, i) => (
              <View
                key={feature.title}
                style={[
                  styles.featureCard,
                  {
                    flex: isMobile ? undefined : 1,
                    padding: isMobile ? 24 : 28,
                  },
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
              style={[styles.sectionTitle, { fontSize: isMobile ? 26 : 32 }]}
            >
              Trusted by Top Companies
            </Text>
          </View>
          <View style={styles.marqueeContainer}>
            <PartnerMarquee />
          </View>
        </MotiView>

        {/* 5. CALL TO ACTION */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 700, delay: 400 }}
          style={styles.ctaSection}
        >
          <View
            style={[
              styles.ctaCard,
              { padding: isMobile ? 28 : isTablet ? 48 : 64 },
            ]}
          >
            <View style={styles.ctaGlow} />
            <Text style={styles.ctaEyebrow}>NEXT CHAPTER</Text>
            <Text style={[styles.ctaTitle, { fontSize: isMobile ? 30 : 44 }]}>
              Ready to begin?
            </Text>
            <Text style={styles.ctaDesc}>
              Access company drives, manage interview invites, or review
              candidate profiles in your secure workspace.
            </Text>

            <View
              style={[
                styles.ctaButtonGroup,
                {
                  flexDirection: isMobile ? "column" : "row",
                  width: isMobile ? "100%" : "auto",
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.btnPrimary, { width: isMobile ? "100%" : 180 }]}
                onPress={goLogin}
              >
                <Text style={styles.btnPrimaryText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.btnSecondary,
                  { width: isMobile ? "100%" : 180 },
                ]}
                onPress={goSignup}
              >
                <Text style={styles.btnSecondaryText}>Create Account</Text>
              </TouchableOpacity>
            </View>
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
          <Brand size={28} />
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
    position: "relative",
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
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: "rgba(31, 91, 255, 0.07)",
  },
  ambientBottom: {
    position: "absolute",
    bottom: -240,
    left: -180,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: "rgba(245, 181, 68, 0.10)",
  },

  /* Nav */
  nav: {
    backgroundColor: "rgba(247, 245, 240, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingTop: Platform.OS === "ios" ? 52 : Platform.OS === "android" ? 28 : 0,
    zIndex: 10,
  },
  navInner: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    height: 68,
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
  navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  navLink: { paddingVertical: 10, paddingHorizontal: 16 },
  navLinkText: { fontSize: 15, fontWeight: "600", color: C.ink },
  navCta: {
    backgroundColor: C.ink,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  navCtaText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  /* Layout */
  scrollLayout: {
    paddingBottom: 56,
    maxWidth: 1312, // 1200 content + horizontal padding headroom
    width: "100%",
    alignSelf: "center",
  },

  /* Hero */
  heroRow: { alignItems: "center", width: "100%" },
  heroLeft: { gap: 24, width: "100%" },
  heroRight: { alignItems: "center", justifyContent: "center" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  mainTitle: {
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -2,
  },
  titleAccent: { color: C.accent },
  subTitle: { color: C.muted },
  heroButtons: { gap: 12, marginTop: 8 },
  btnInk: {
    backgroundColor: C.ink,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadow(8, 20, 0.18),
  },
  btnInkText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  btnOutline: {
    backgroundColor: C.card,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { fontSize: 16, fontWeight: "700", color: C.ink },

  /* Pipeline card */
  heroGlow: {
    position: "absolute",
    width: "80%",
    height: "80%",
    borderRadius: 999,
    backgroundColor: "rgba(31, 91, 255, 0.10)",
  },
  pipelineCard: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
    ...shadow(24, 48, 0.1),
  },
  pipelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: "#FBFAF7",
  },
  pipelineKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.faint,
  },
  pipelineTitle: {
    fontSize: 16,
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
  pipelineBody: { padding: 22, paddingBottom: 14 },
  stepRow: { flexDirection: "row", gap: 16, minHeight: 64 },
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
    backgroundColor: C.ink,
    borderRadius: 28,
    overflow: "hidden",
    ...shadow(16, 40, 0.14),
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
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.amber,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  /* Sections */
  section: { gap: 36, width: "100%" },
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
    borderRadius: 24,
    gap: 28,
    ...shadow(6, 20, 0.04),
  },
  featureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureNumber: {
    fontSize: 44,
    fontWeight: "800",
    color: "#EFECE4",
    letterSpacing: -2,
  },
  featureTextWrap: { gap: 8 },
  featureTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.3,
  },
  featureDesc: { fontSize: 15, color: C.muted, lineHeight: 24 },

  /* Marquee */
  marqueeContainer: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 24,
    paddingVertical: 24,
    overflow: "hidden",
  },

  /* CTA */
  ctaSection: { width: "100%" },
  ctaCard: {
    backgroundColor: C.ink,
    borderRadius: 32,
    alignItems: "center",
    gap: 18,
    overflow: "hidden",
    ...shadow(20, 40, 0.18),
  },
  ctaGlow: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(31, 91, 255, 0.35)",
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
    lineHeight: 26,
    maxWidth: 500,
    marginBottom: 10,
  },
  ctaButtonGroup: { gap: 14, justifyContent: "center" },
  btnPrimary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: C.ink },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#3A4260",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  /* Footer */
  footer: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: C.line,
    width: "100%",
  },
  footerText: { fontSize: 14, color: C.faint, fontWeight: "500" },
});
