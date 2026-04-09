export const COLORS = {
  // Backgrounds
  bg: '#000000',
  bgElevated: 'rgba(241,236,225,0.06)',
  bgSubtle: 'rgba(241,236,225,0.03)',

  // Text
  text: '#f1ece1',
  textMuted: 'rgba(241,236,225,0.5)',
  textFaint: 'rgba(241,236,225,0.4)',
  textDim: 'rgba(241,236,225,0.3)',

  // Borders / dividers
  border: 'rgba(241,236,225,0.08)',
  borderSubtle: 'rgba(241,236,225,0.05)',

  // Accents
  accent: '#f1ece1',
  danger: '#ff3b30',

  // On-accent (text/icons drawn on top of `accent` surfaces)
  onAccent: '#000100',
} as const;

export type ColorToken = keyof typeof COLORS;
