import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'transparent' | 'white';
}

export default function Card({ children, style, variant = 'default' }: CardProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'white':
        return styles.whiteCard;
      case 'transparent':
        return styles.transparentCard;
      default:
        return styles.defaultCard;
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.cardPadding,
    ...shadows.lg,
  },
  defaultCard: {
    backgroundColor: colors.white[10],
    borderWidth: 1,
    borderColor: colors.white[20],
  },
  whiteCard: {
    backgroundColor: colors.white.full,
  },
  transparentCard: {
    backgroundColor: colors.transparent,
  },
});
