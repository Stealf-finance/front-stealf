import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Calculate scale factors
export const widthScale = SCREEN_WIDTH / BASE_WIDTH;
export const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
export const moderateScale = (widthScale + heightScale) / 2;

// Scale functions
export const scale = (size: number) => size * widthScale;
export const verticalScale = (size: number) => size * heightScale;
export const moderateScaleSize = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

// Responsive font size
export const responsiveFontSize = (size: number) => {
  const scale = Math.min(widthScale, heightScale);
  return Math.round(size * scale);
};

// Check if device is small (like iPhone SE)
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
