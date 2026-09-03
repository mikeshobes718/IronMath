import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { theme } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';

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
  const hydrated = useAppStore((state) => state.hydrated);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      useAppStore.setState({ hydrated: true });
    });
    if (useAppStore.persist.hasHydrated()) {
      useAppStore.setState({ hydrated: true });
    }
    const timeout = setTimeout(() => {
      useAppStore.setState({ hydrated: true });
    }, 600);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      void SplashScreen.hideAsync();
    }
  }, [hydrated]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

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
