import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallPhone = width < 360;
  const isLandscape = width > height;

  // Scale factor relative to baseline 375px (iPhone standard)
  const scale = Math.min(Math.max(width / 375, 0.85), 1.3);

  function fs(size: number) {
    return Math.round(size * scale);
  }

  return { width, height, isTablet, isSmallPhone, isLandscape, scale, fs };
}
