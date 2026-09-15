import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ComponentType } from 'react';
import { InteractionManager } from 'react-native';
import 'react-native-reanimated';
import { ToolsBackButton } from '../src/components/ToolsBackButton';
import { ThemeRoot, useThemeColors } from '../src/theme/ThemeRoot';

function openWarmupFromUrl(url: string) {
  if (!url.toLowerCase().includes('warmup')) {
    return;
  }
  const query = Linking.parse(url).queryParams ?? {};
  const params: { rung?: string; unit?: string } = {};
  if (typeof query.rung === 'string' && query.rung.length > 0) {
    params.rung = query.rung;
  }
  if (query.unit === 'lb' || query.unit === 'kg') {
    params.unit = query.unit;
  }
  // navigate, not replace: warmup is a tab, and the native tab router handles
  // NAVIGATE (a jump to the tab) but not REPLACE. Glance and rest below are
  // stack screens, where replace is the right call.
  setTimeout(() => {
    router.navigate({ pathname: '/warmup', params });
  }, 250);
}

function openGlanceFromUrl(url: string) {
  const parsed = Linking.parse(url);
  const hay = `${url} ${parsed.path ?? ''} ${parsed.hostname ?? ''}`.toLowerCase();
  if (!hay.includes('glance')) {
    return;
  }
  const glasses = parsed.queryParams?.glasses;
  const params: { glasses?: string } = {};
  if (typeof glasses === 'string' && glasses.length > 0) {
    params.glasses = glasses;
  }
  setTimeout(() => {
    router.replace({ pathname: '/glance', params } as never);
  }, 250);
}

function openRestFromUrl(url: string) {
  const parsed = Linking.parse(url);
  const hay = `${url} ${parsed.path ?? ''} ${parsed.hostname ?? ''}`.toLowerCase();
  if (!hay.includes('rest')) {
    return;
  }
  setTimeout(() => {
    router.replace('/rest' as never);
  }, 250);
}

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// The oversized capsule around this button is iOS 26 itself, not this
// component: swapping it for the plain native back button (tested directly)
// produces the exact same size, so react-native-screens/UIKit enforces a
// fixed minimum Liquid Glass capsule on every nav-bar back button now,
// native or custom, with no override available in this react-native-screens
// version. Native also dropped the accent tint. So: one component,
// everywhere, for a consistent look and a guaranteed way back to Tools from
// the two screens (glance, rest) that can be entered by deep link with no
// back-stack to pop to.
function toolOptions(title: string) {
  return {
    title,
    headerShown: true,
    headerBackVisible: false,
    headerLeft: () => <ToolsBackButton />,
    gestureEnabled: true,
  };
}

function RootStack() {
  const theme = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerTitleStyle: { color: theme.text, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Tools' }} />
      <Stack.Screen name="lift" options={toolOptions('Lift')} />
      <Stack.Screen name="club" options={toolOptions('1000 lb Club')} />
      <Stack.Screen name="percent" options={toolOptions('Percentage chart')} />
      <Stack.Screen name="remaining" options={toolOptions('How much more')} />
      <Stack.Screen name="convert" options={toolOptions('Convert LB and KG')} />
      <Stack.Screen name="glance" options={toolOptions('Gym glance')} />
      <Stack.Screen name="rest" options={toolOptions('Rest timer')} />
      <Stack.Screen name="onerm" options={toolOptions('Estimate your max')} />
      <Stack.Screen name="rpe" options={toolOptions('How hard is this set')} />
      <Stack.Screen name="dots" options={toolOptions('Meet score')} />
      <Stack.Screen name="attempts" options={toolOptions('Plan three attempts')} />
      <Stack.Screen name="settings" options={toolOptions('Settings')} />
    </Stack>
  );
}

function DeferredGymHud() {
  const [Hud, setHud] = useState<ComponentType | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('../src/wearables/gymHud')
        .then((mod) => {
          setHud(() => mod.GymHudSync);
        })
        .catch(() => undefined);
    });
    return () => task.cancel();
  }, []);

  if (!Hud) {
    return null;
  }
  return <Hud />;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const open = (url: string | null) => {
      if (!url) {
        return;
      }
      openWarmupFromUrl(url);
      openGlanceFromUrl(url);
      openRestFromUrl(url);
      void import('../src/wearables/gymHud')
        .then((mod) => mod.handleIncomingWearablesUrl(url))
        .catch(() => undefined);
    };
    void Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', (event) => open(event.url));
    return () => sub.remove();
  }, []);

  return (
    <ThemeRoot>
      <RootStack />
      <DeferredGymHud />
    </ThemeRoot>
  );
}
