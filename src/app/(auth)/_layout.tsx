import { Stack } from 'expo-router';
import { C } from '@/theme/design';

/**
 * Groups login / signup / forgot-password / verify-otp into one navigator.
 * Without this file, the root layout's <Stack.Screen name="(auth)" /> pointed at a group that had no
 * layout, so Expo Router logged: No route named "(auth)" exists in nested children.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />;
}
