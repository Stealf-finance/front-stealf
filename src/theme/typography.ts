export const typography = {
  // Font families
  fonts: {
    regular: 'Sansation-Regular',
    bold: 'Sansation-Bold',
    light: 'Sansation-Light',
    italic: 'Sansation-Italic',
  },

  // Font sizes
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 36,
    xxxl: 48,
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
  },
};
