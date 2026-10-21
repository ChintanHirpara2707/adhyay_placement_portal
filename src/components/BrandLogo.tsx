import React from 'react';
import { Image, ImageStyle, StyleProp, useWindowDimensions } from 'react-native';
import { LOGO_RATIO } from '@/theme/design';

const LOGO = require('@/assets/images/logo.png');

export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Logo height in px per size: [narrow phone (<380), phone (<768), tablet / web]. */
const HEIGHTS: Record<BrandLogoSize, [number, number, number]> = {
  sm: [30, 34, 38],
  md: [38, 42, 44],
  lg: [96, 112, 128],
  xl: [110, 130, 150],
};

/**
 * The one place the Adhyay logo is rendered. The artwork already contains the wordmark,
 * so no text is ever drawn next to it. Width is derived from height to keep the aspect
 * ratio, and capped so the logo never overflows a narrow screen.
 */
export const BrandLogo: React.FC<{ size?: BrandLogoSize; style?: StyleProp<ImageStyle> }> = ({ size = 'md', style }) => {
  const { width } = useWindowDimensions();
  const [narrow, phone, wide] = HEIGHTS[size];
  const wanted = width < 380 ? narrow : width < 768 ? phone : wide;
  const height = Math.min(wanted, Math.max(24, (width - 32) / LOGO_RATIO));
  return (
    <Image
      source={LOGO}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Adhyay Placement Portal"
      style={[{ height, width: height * LOGO_RATIO, flexShrink: 0 }, style]}
    />
  );
};
