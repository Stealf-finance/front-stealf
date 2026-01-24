export const COLORS = {
    // Backgrounds
    backgroundPublicStart: '#000000',
    backgroundPublicEnd: '#1a1a1a',
    backgroundPrivacyStart: '#050008',
    backgroundPrivacyEnd: '#15092a',

    // Accent
    accent: '#E85D75', // Rose coral - CTAs principaux
    accentPressed: '#C94D63', // État pressed

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    textDisabled: 'rgba(255, 255, 255, 0.3)',

    // Surfaces
    cardBackground: 'rgba(30, 30, 30, 0.6)',
    cardBackgroundElevated: 'rgba(40, 40, 40, 0.8)',

    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderFocus: 'rgba(255, 255, 255, 0.2)',

    // Semantic
    success: '#34C759',
    warning: '#FFD60A',
    error: '#FF453A',

    // Privacy-specific
    privacyAccent: '#8B5CF6', // Violet pour éléments privacy
    privacyBorder: 'rgba(139, 92, 246, 0.3)',
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const BORDER_RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 38,
    full: 9999,
} as const;

export const TYPOGRAPHY = {
    fontFamily: {
        regular: 'Sansation-Regular',
        bold: 'Sansation-Bold',
        light: 'Sansation-Light',
    },
    fontSize: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
        display: 32,
        hero: 48,
    },
    lineHeight: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },
} as const;
