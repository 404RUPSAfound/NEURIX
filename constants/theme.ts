import { Platform } from 'react-native';

export const COLORS = {
  bg: '#0A0E1A',
  bgCard: '#0F1629',
  bgDark: '#070A13',
  border: '#1A2640',
  borderLight: '#243050',
  primary: '#E53935',
  primaryDark: '#B71C1C',
  primaryGlow: '#E5393520',
  green: '#4CAF50',
  greenDark: '#1B5E20',
  orange: '#FF6F00',
  blue: '#1565C0',
  textPrimary: '#FFFFFF',
  textSecondary: '#546E8A',
  textMuted: '#2A3A4A',
  critical: '#E53935',
  high: '#FF6F00',
  medium: '#1565C0',
  low: '#2E7D32',
};

const COMMON_COLORS = {
  background: COLORS.bg,
  text: COLORS.textPrimary,
  tint: COLORS.primary,
  icon: COLORS.textSecondary,
  tabIconDefault: COLORS.textSecondary,
  tabIconSelected: COLORS.primary,
};

export const Colors = {
  light: { ...COLORS, ...COMMON_COLORS },
  dark: { ...COLORS, ...COMMON_COLORS },
};

export const FONTS = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  bold: { fontWeight: '700' as const },
  heavy: { fontWeight: '800' as const },
};

export const Fonts = {
  ...FONTS,
  rounded: 'System',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};