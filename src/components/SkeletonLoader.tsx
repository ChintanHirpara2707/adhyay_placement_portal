import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { Theme } from '@/theme/theme';
import { C } from '@/theme/design';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}) => {
  return (
    <MotiView
      from={{ opacity: 0.35 }}
      animate={{ opacity: 0.85 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
      }}
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

export const JobCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Skeleton width="65%" height={22} borderRadius={6} />
        <Skeleton width="25%" height={22} borderRadius={999} />
      </View>
      <View style={styles.spacing} />
      <Skeleton width="40%" height={16} borderRadius={4} />
      <View style={styles.spacingLarge} />
      <View style={styles.footerRow}>
        <Skeleton width="30%" height={18} borderRadius={4} />
        <Skeleton width="40%" height={18} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: C.line,
  },
  cardContainer: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacing: {
    height: 8,
  },
  spacingLarge: {
    height: 14,
  },
});
