import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface AnimatedTabIconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: any;
  size?: number;
  focused: boolean;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  color,
  size = 24,
  focused,
}) => {
  return (
    <MotiView
      animate={{
        scale: focused ? 1.18 : 1.0,
        translateY: focused ? -2 : 0,
      }}
      transition={{
        type: 'spring',
        damping: 14,
        stiffness: 220,
      }}
      style={styles.container}
    >
      <MaterialCommunityIcons name={name} color={color} size={size} />
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
