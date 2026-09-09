import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemeColors } from './index';
import { useThemeColors } from './ThemeRoot';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(factory: (theme: ThemeColors) => T): T {
  const theme = useThemeColors();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
