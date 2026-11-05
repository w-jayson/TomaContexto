import { useWindowDimensions, Platform } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isWide = width >= 768;
  const isMobile = width < 768;

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
  };
}
