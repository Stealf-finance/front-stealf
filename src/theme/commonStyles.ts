import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';
import { shadows } from './shadows';

export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },

  // Cards
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.cardPadding,
    ...shadows.lg,
  },
  whiteCard: {
    backgroundColor: colors.white.full,
  },
  transparentCard: {
    backgroundColor: colors.white[10],
    borderWidth: 1,
    borderColor: colors.white[20],
  },

  // Text styles
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white.full,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white[80],
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.white[90],
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.white[60],
  },
  error: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
  },

  // Buttons
  button: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonViolet: {
    backgroundColor: colors.violet.main,
  },
  buttonGray: {
    backgroundColor: colors.gray.main,
  },
  buttonSecondary: {
    backgroundColor: colors.white[90],
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white.full,
  },
  buttonTextDark: {
    color: colors.black[80],
  },

  // Inputs
  input: {
    backgroundColor: colors.white[10],
    borderWidth: 1,
    borderColor: colors.white[20],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    color: colors.white.full,
    fontSize: typography.fontSize.md,
  },
  inputError: {
    borderColor: colors.error,
  },

  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },

  // Spacing utilities
  mt_xs: { marginTop: spacing.xs },
  mt_sm: { marginTop: spacing.sm },
  mt_md: { marginTop: spacing.md },
  mt_lg: { marginTop: spacing.lg },
  mt_xl: { marginTop: spacing.xl },

  mb_xs: { marginBottom: spacing.xs },
  mb_sm: { marginBottom: spacing.sm },
  mb_md: { marginBottom: spacing.md },
  mb_lg: { marginBottom: spacing.lg },
  mb_xl: { marginBottom: spacing.xl },

  mx_sm: { marginHorizontal: spacing.sm },
  mx_md: { marginHorizontal: spacing.md },
  mx_lg: { marginHorizontal: spacing.lg },

  my_sm: { marginVertical: spacing.sm },
  my_md: { marginVertical: spacing.md },
  my_lg: { marginVertical: spacing.lg },

  p_sm: { padding: spacing.sm },
  p_md: { padding: spacing.md },
  p_lg: { padding: spacing.lg },

  px_sm: { paddingHorizontal: spacing.sm },
  px_md: { paddingHorizontal: spacing.md },
  px_lg: { paddingHorizontal: spacing.lg },

  py_sm: { paddingVertical: spacing.sm },
  py_md: { paddingVertical: spacing.md },
  py_lg: { paddingVertical: spacing.lg },
});
