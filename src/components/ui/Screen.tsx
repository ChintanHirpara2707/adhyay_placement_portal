import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { C } from '@/theme/design';
import { useBreakpoint } from './useBreakpoint';

/**
 * Standard scrolling page: keyboard aware (the top navbar and tab bar own the safe-area insets), centered max-width column
 * with responsive gutters. Every screen below the top navbar should render inside this.
 */
export const Screen: React.FC<{
  children: React.ReactNode;
  testID?: string;
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
}> = ({ children, testID, refreshControl }) => {
  const { isSmall, isMobile, isTablet } = useBreakpoint();
  const gutter = isSmall ? 16 : isMobile ? 20 : isTablet ? 32 : 56;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  content: { paddingTop: 20, paddingBottom: 40 },
  column: { width: '100%', maxWidth: 1100, alignSelf: 'center', gap: 16 },
});
