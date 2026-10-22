import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthBootstrap, useAuthGate } from '@/lib/authSession';
import { useAuthStore } from '@/store/authStore';
import { useNavigationWatcher } from '@/hooks/useSafeNavigate';
import { ScreenLoader } from '@/components/loading/ScreenLoader';
import { TopProgressBar } from '@/components/loading/TopProgressBar';
import { customPaperTheme, Theme } from '@/theme/theme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AlertHost } from '@/components/AlertHost';

SplashScreen.preventAutoHideAsync();

// Ensure icon font is injected into DOM on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const iconFontStyles = `
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}');
    }
    @font-face {
      font-family: 'material-community';
      src: url('${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}');
    }
    @font-face {
      font-family: 'Material Design Icons';
      src: url('${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}');
    }
  `;
  if (!document.getElementById('material-community-icons-style')) {
    const style = document.createElement('style');
    style.id = 'material-community-icons-style';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(iconFontStyles));
    document.head.appendChild(style);
  }
}

/** Mounted inside the navigator so it can read the route and redirect (see useAuthGate). */
function AuthGate() {
  useAuthGate();
  useNavigationWatcher(); // settles the top progress bar once a navigation has landed
  return null;
}

/**
 * Covers the app while the session / role is being resolved (app start, after login, after Google
 * sign-in, role redirects) so users never see a white flash or the wrong screen for a moment.
 */
function AuthLoadingOverlay() {
  const loading = useAuthStore((s) => s.loading);
  const resolving = useAuthStore((s) => !!s.session && !s.roleResolved);
  if (!loading && !resolving) return null;
  return (
    <View style={styles.overlay}>
      <ScreenLoader />
    </View>
  );
}

export default function RootLayout() {
  // Static web export pre-renders with a 0px window, and React does not repair style-only
  // hydration mismatches, so width-based sizes (logo, gutters) would stay wrong. Render on the
  // client only; native is unaffected.
  const [mounted, setMounted] = useState(Platform.OS !== 'web');
  useEffect(() => setMounted(true), []);
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
    MaterialCommunityIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'Material Design Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });
  useAuthBootstrap();

  const authLoading = useAuthStore((s) => s.loading);
  const appReady = mounted && (fontsLoaded || !!fontError);

  // Never a blank frame: show the branded loader until the client has mounted and the icon font is ready.
  if (!appReady) return <ScreenLoader />;

  const whiteNavTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Theme.colors.background,
      card: Theme.colors.background,
      text: Theme.colors.primaryText,
      border: Theme.colors.border,
      primary: Theme.colors.primaryAccent,
    },
  };

  return (
    <ThemeProvider value={whiteNavTheme}>
      <PaperProvider theme={customPaperTheme}>
        <StatusBar style="dark" />
        <AlertHost />
        <AnimatedSplashOverlay ready={!authLoading} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(company)" />
          <Stack.Screen name="(admin)" />
        </Stack>
        <AuthGate />
        <AuthLoadingOverlay />
        <TopProgressBar />
      </PaperProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // Below the native splash overlay (zIndex 1000) so the splash still covers app start.
  overlay: { ...StyleSheet.absoluteFill, zIndex: 900, backgroundColor: '#FFFFFF' },
});
