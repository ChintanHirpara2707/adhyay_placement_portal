import { useWindowDimensions } from 'react-native';
import { BP } from '@/theme/design';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isSmall: width < BP.small,
    isMobile: width < BP.mobile,
    isTablet: width >= BP.mobile && width < BP.desktop,
    isDesktop: width >= BP.desktop,
  };
}
