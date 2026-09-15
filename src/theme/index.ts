export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
  success: string;
  tab: string;
  glass: string;
};

export type AppearanceMode = 'system' | 'light' | 'dark';

export const darkColors: ThemeColors = {
  bg: '#050506',
  surface: '#151417',
  surfaceRaised: '#1D1C20',
  card: '#242226',
  border: 'rgba(250,250,250,0.09)',
  borderStrong: 'rgba(250,250,250,0.16)',
  text: '#F7F6F4',
  muted: '#A6A3A8',
  dim: '#716E74',
  accent: '#E0AD79',
  accentSoft: 'rgba(224,173,121,0.16)',
  accentText: '#1C1410',
  danger: '#FF6B5E',
  success: '#4ADE80',
  tab: 'rgba(10,10,11,0.72)',
  glass: 'rgba(255,255,255,0.06)',
};

export const lightColors: ThemeColors = {
  bg: '#F2F1EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  card: '#E4E1DB',
  border: 'rgba(20,18,16,0.10)',
  borderStrong: 'rgba(20,18,16,0.18)',
  text: '#18181B',
  muted: '#57545A',
  dim: '#8A868C',
  accent: '#B87F42',
  accentSoft: 'rgba(184,127,66,0.12)',
  accentText: '#FFFFFF',
  danger: '#DC2626',
  success: '#15803D',
  tab: 'rgba(255,255,255,0.78)',
  glass: 'rgba(20,18,16,0.04)',
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
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/**
 * Colour helpers emit `boxShadow` rather than the `shadow*` family: React
 * Native deprecated those on the New Architecture, and they warn on every
 * render.
 */
function rgba(color: string, alpha: number): string {
  const hex = color.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    // Already rgba()/named — fall back to a neutral shadow rather than emitting
    // something the style parser will reject.
    return `rgba(0,0,0,${alpha})`;
  }
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** A soft, low-spread shadow that reads as depth rather than a hard drop shadow. */
export function cardShadow(color: string, opacity = 0.28) {
  return { boxShadow: `0px 10px 24px ${rgba(color, opacity)}` } as const;
}

/** A tight glow used behind hero numbers and active controls. */
export function glowShadow(color: string, opacity = 0.5) {
  return { boxShadow: `0px 0px 20px ${rgba(color, opacity)}` } as const;
}
