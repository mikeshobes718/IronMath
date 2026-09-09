export type ThemeColors = {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentText: string;
  danger: string;
  success: string;
  tab: string;
};

export type AppearanceMode = 'system' | 'light' | 'dark';

export const darkColors: ThemeColors = {
  bg: '#09090B',
  surface: '#18181B',
  card: '#27272A',
  border: '#3F3F46',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  dim: '#71717A',
  accent: '#D4A373',
  accentText: '#1C1410',
  danger: '#F87171',
  success: '#4ADE80',
  tab: '#0C0C0E',
};

export const lightColors: ThemeColors = {
  bg: '#F4F4F5',
  surface: '#FFFFFF',
  card: '#E4E4E7',
  border: '#D4D4D8',
  text: '#18181B',
  muted: '#52525B',
  dim: '#71717A',
  accent: '#D4A373',
  accentText: '#1C1410',
  danger: '#DC2626',
  success: '#15803D',
  tab: '#FFFFFF',
};

export const theme = darkColors;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;
