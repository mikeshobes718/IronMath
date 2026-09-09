import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { darkColors, lightColors, type ThemeColors } from './index';

const ThemeColorsContext = createContext<ThemeColors>(darkColors);
const SchemeContext = createContext<'light' | 'dark'>('dark');

export function useThemeColors(): ThemeColors {
  return useContext(ThemeColorsContext);
}

export function useResolvedScheme(): 'light' | 'dark' {
  return useContext(SchemeContext);
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const appearance = useAppStore((state) => state.appearance);
  const system = useColorScheme();
  const scheme: 'light' | 'dark' =
    appearance === 'system' ? (system === 'light' ? 'light' : 'dark') : appearance;
  const colors = scheme === 'light' ? lightColors : darkColors;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  const navTheme = useMemo(
    () => ({
      ...(scheme === 'light' ? DefaultTheme : DarkTheme),
      colors: {
        ...(scheme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
        background: colors.bg,
        card: colors.tab,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [scheme, colors]
  );

  return (
    <SchemeContext.Provider value={scheme}>
      <ThemeColorsContext.Provider value={colors}>
        <ThemeProvider value={navTheme}>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
          {children}
        </ThemeProvider>
      </ThemeColorsContext.Provider>
    </SchemeContext.Provider>
  );
}
