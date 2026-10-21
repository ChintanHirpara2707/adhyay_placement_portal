import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Must match `expo-splash-screen` backgroundColor / imageWidth in app.json so the hand-off is seamless. */
const SPLASH_BG = '#1E3A8A';
const SPLASH_WIDTH = 240;
const SPLASH_RATIO = 1200 / 548; // assets/images/splash-logo.png
const DURATION = 400;

/** Branded splash: the native splash hides, this identical overlay fades out. */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const fadeOut = new Keyframe({
    0: { opacity: 1 },
    100: { opacity: 0, easing: Easing.out(Easing.quad) },
  });

  const image = (
    <Image
      style={styles.image}
      source={require('@/assets/images/splash-logo.png')}
      contentFit="contain"
      accessibilityLabel="Adhyay Placement Portal"
    />
  );

  return animate ? (
    <Animated.View
      entering={fadeOut.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: SPLASH_WIDTH,
    height: SPLASH_WIDTH / SPLASH_RATIO,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
