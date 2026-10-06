import React from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme/design';
import { useBreakpoint } from './useBreakpoint';

export const Screen: React.FC<{ children: React.ReactNode; testID?: string; refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>> }> = ({ children, testID, refreshControl }) => {
  const insets = useSafeAreaInsets();
  const { isSmall, isMobile, isTablet } = useBreakpoint();
  const gutter = isSmall ? 16 : isMobile ? 20 : isTablet ? 32 : 56;
  const padTop = Platform.OS === 'web' ? 0 : insets.top;
  const padBottom = Platform.OS === 'web' ? 0 : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: padTop, paddingBottom: padBottom }]} testID={testID}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  content: { paddingTop: 20, paddingBottom: 40 },
  column: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 16 },
});
