import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { theme } from '../src/theme';

SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(theme.bg);

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: theme.tab,
    text: theme.text,
    border: theme.border,
    primary: theme.accent,
  },
};

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text, fontWeight: '700' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onerm" options={{ title: 'One-Rep Max' }} />
        <Stack.Screen name="rpe" options={{ title: 'RPE / RIR' }} />
        <Stack.Screen name="dots" options={{ title: 'DOTS / IPF GL' }} />
        <Stack.Screen name="attempts" options={{ title: 'Meet Attempts' }} />
        <Stack.Screen name="convert" options={{ title: 'LB / KG' }} />
      </Stack>
    </ThemeProvider>
  );
}
