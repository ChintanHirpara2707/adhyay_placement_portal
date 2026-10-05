import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  duration?: number;
}

const AnimatedComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  scaleTo = 0.96,
  duration = 150,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: any) => {
    scale.value = withTiming(scaleTo, { duration });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    onPressOut?.(event);
  };

  return (
    <AnimatedComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedComponent>
  );
};
