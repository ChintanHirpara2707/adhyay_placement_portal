import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { customPaperTheme, Theme } from '@/theme/theme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    MaterialCommunityIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'Material Design Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });
  const setSession = useAuthStore((state) => state.setSession);
  const setRole = useAuthStore((state) => state.setRole);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // Check active sessions and fetch roles
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error('Failed to fetch role on layout load:', error.message);
            }
            if (data && !error) {
              setRole(data.role);
            }
            setLoading(false);
          });
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Listen for auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) {
          console.error('Failed to fetch role on auth state change:', error.message);
        }
        if (data && !error) {
          setRole(data.role);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        <AnimatedSplashOverlay />
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
      </PaperProvider>
    </ThemeProvider>
  );
}
