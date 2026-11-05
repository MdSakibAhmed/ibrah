export const Colors = {
  // Primary: Serene Emerald Forest
  primary: '#0D3B2E',
  primaryLight: '#165B47',
  primaryDark: '#07241C',
  primaryFaded: 'rgba(13, 59, 46, 0.08)',
  primaryBorder: 'rgba(13, 59, 46, 0.15)',

  // Accent: Warm Gold / Amber
  accent: '#C59B27',
  accentLight: '#FAF5EA',
  accentDark: '#8F6E15',
  accentBorder: 'rgba(197, 155, 39, 0.3)',

  // Background & Surface
  background: '#F8FAF8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  elevated: '#FFFFFF',

  // Typography
  text: '#192420',
  textSecondary: '#566B63',
  textMuted: '#879B93',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E3ECE7',
  borderLight: '#EDF3F0',

  // Status
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  info: '#0277BD',
  infoLight: '#E1F5FE',
};

export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};
