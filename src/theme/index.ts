export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, layout } from './spacing';
export { shadows } from './shadows';
export { commonStyles } from './commonStyles';

// Combined theme object
export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  layout: require('./spacing').layout,
  shadows: require('./shadows').shadows,
};

export type Theme = typeof theme;
