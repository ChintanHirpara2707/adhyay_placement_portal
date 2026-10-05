import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MotiView } from 'moti';
import { Card } from 'react-native-paper';
import { AnimatedPressable } from './AnimatedPressable';
import { Theme } from '@/theme/theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  delay = 0,
  duration = 300,
}) => {
  const content = (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration,
        delay,
      }}
    >
      <Card style={[styles.card, style]} elevation={1}>
        {children}
      </Card>
    </MotiView>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} scaleTo={0.98} duration={120}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
});
