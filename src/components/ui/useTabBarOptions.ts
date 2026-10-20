import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme/design';

/**
 * Shared bottom tab bar styling for the student, company and admin layouts.
 * Active tab uses the accent colour; inactive uses the muted text colour (>= 4.5:1 on white).
 */
export function useTabBarOptions() {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? 0 : insets.bottom;
  return {
    headerShown: false,
    tabBarActiveTintColor: C.accent,
    tabBarInactiveTintColor: C.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      backgroundColor: C.paper,
      borderTopWidth: 1,
      borderTopColor: C.line,
      elevation: 0,
      shadowOpacity: 0,
      height: 60 + bottom,
      paddingBottom: 8 + bottom,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };
}
