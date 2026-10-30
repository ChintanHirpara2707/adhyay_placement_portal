import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as SplashScreen from 'expo-splash-screen';
import { BrandLogo } from '@/components/BrandLogo';
import { Theme } from '@/theme/theme';
import { C } from '@/theme/design';

/* ------------------------------------------------------------------ */
/* When does the intro play?                                           */
/* ------------------------------------------------------------------ */
const SESSION_KEY = 'adhyay:intro-played';
let playedThisPageLoad = false;

/** Native: every cold start. Web: once per browser session (sessionStorage can throw, so it is guarded). */
export function shouldPlayIntro(): boolean {
  if (Platform.OS !== 'web') return true;
  if (playedThisPageLoad) return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return true; // storage unavailable: still play once for this page load
  }
}

export function markIntroPlayed() {
  playedThisPageLoad = true;
  if (Platform.OS !== 'web') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* storage unavailable: the in-memory flag above still prevents a replay on this page load */
  }
}

/* ------------------------------------------------------------------ */
/* Timeline (ms)                                                       */
/* ------------------------------------------------------------------ */
const FADE_IN_MS = 600; //   0 - 600   logo fades/scales in
const LINE_DELAY_MS = 400; // 400 - 1300 line grows from the centre
const LINE_MS = 900;
const SHIMMER_DELAY_MS = 500; // 500 - 1400 one light sweep across the logo
const SHIMMER_MS = 900;
const MIN_PLAY_MS = 1500; //  fade-out may start from here ...
const EXIT_MS = 400; //       ... and takes 400ms (1500 - 1900)
const SAFETY_MS = 6000; //    the intro never outlives this, resolved or not

const LINE_HEIGHT = 3;
const LINE_WIDTH_RATIO = 0.4; // of the logo width

/**
 * Brand intro shown once at app start, right after the native splash (which is a plain white screen, so the
 * first frame here is identical and there is no flash or jump). It plays while the session and role are
 * resolved in the background, and only leaves once BOTH the animation has run AND `ready` is true.
 * Tap anywhere to skip the animation; the 6s safety cap fades it out regardless.
 */
export const AppIntro: React.FC<{
  /** Session + role are resolved: the app underneath is ready to show the right screen. */
  ready: boolean;
  onFinish: () => void;
  onStart?: () => void;
  /** Called when the safety cap ended the intro before startup resolved. */
  onTimeout?: () => void;
}> = ({ ready, onFinish, onStart, onTimeout }) => {
  const reduceMotion = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [logoWidth, setLogoWidth] = useState(0);
  const exiting = useRef(false);
  const handedOff = useRef(false);

  const container = useSharedValue(1);
  const fade = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);
  const line = useSharedValue(0);
  const shimmer = useSharedValue(-1);

  // Start the animation and the timers.
  useEffect(() => {
    onStart?.();
    if (reduceMotion) {
      fade.value = withTiming(1, { duration: 300 });
    } else {
      fade.value = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
      // overshootClamping: a soft settle, never a bounce
      scale.value = withSpring(1, { damping: 20, stiffness: 120, mass: 1, overshootClamping: true });
      line.value = withDelay(LINE_DELAY_MS, withTiming(1, { duration: LINE_MS, easing: Easing.out(Easing.cubic) }));
      shimmer.value = withDelay(SHIMMER_DELAY_MS, withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.quad) }));
    }
    const minTimer = setTimeout(() => setMinElapsed(true), reduceMotion ? 600 : MIN_PLAY_MS);
    const safetyTimer = setTimeout(() => setTimedOut(true), SAFETY_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      [container, fade, scale, line, shimmer].forEach(cancelAnimation);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idempotent: it can be reached from the animation callback AND from the timer fallback below.
  const finished = useRef(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  // Leave when the animation is done AND startup is resolved; the safety cap leaves regardless.
  useEffect(() => {
    if (exiting.current) return;
    if (!(timedOut || (minElapsed && ready))) return;
    exiting.current = true;
    if (timedOut && !ready) onTimeout?.();
    const exitMs = reduceMotion ? 200 : EXIT_MS;
    container.value = withTiming(0, { duration: exitMs }, (done) => {
      'worklet';
      if (done) scheduleOnRN(finish);
    });
    // Never stuck: animation frames can be paused (background tab, hidden webview), which would stall the fade
    // and its completion callback. A plain timer guarantees the intro leaves.
    fallbackTimer.current = setTimeout(finish, exitMs + 250);
  }, [minElapsed, ready, timedOut, reduceMotion, container, finish, onTimeout]);

  // Hand over from the native splash only once this view has really been laid out and drawn.
  const onLayout = useCallback(() => {
    if (handedOff.current || Platform.OS === 'web') return;
    handedOff.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => SplashScreen.hideAsync().catch(() => {})));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: scale.value }] }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scaleX: line.value }] }));
  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimmer.value * logoWidth }] }));

  return (
    <Animated.View style={[styles.root, containerStyle]} onLayout={onLayout}>
      <Pressable
        style={styles.press}
        onPress={() => setMinElapsed(true)}
        accessibilityRole="button"
        accessibilityLabel="Adhyay Placement Portal. Tap to skip the intro."
      >
        <Animated.View style={logoStyle} onLayout={(e: LayoutChangeEvent) => setLogoWidth(e.nativeEvent.layout.width)}>
          <View style={styles.logoClip}>
            <BrandLogo size="xl" />
            {!reduceMotion && logoWidth > 0 ? (
              <Animated.View pointerEvents="none" style={[styles.band, { width: logoWidth * 0.35 }, bandStyle]} />
            ) : null}
          </View>
        </Animated.View>
        {!reduceMotion && logoWidth > 0 ? (
          <Animated.View style={[styles.line, { width: logoWidth * LINE_WIDTH_RATIO }, lineStyle]} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Above everything, including dialogs and the auth overlay.
  root: { ...(StyleSheet.absoluteFill as object), zIndex: 2000, backgroundColor: Theme.colors.background },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  logoClip: { overflow: 'hidden' },
  // A soft white highlight: it only shows over the logo's coloured pixels, so it reads as a shimmer on the logo.
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.55)' },
  line: { height: LINE_HEIGHT, borderRadius: LINE_HEIGHT / 2, backgroundColor: C.navy },
});
