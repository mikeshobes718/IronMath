import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedScheme, useThemeColors } from '../../src/theme/ThemeRoot';

function TabIcon(props: { name: ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={19} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const scheme = useResolvedScheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.dim,
        // A frosted-glass tab bar — translucent so content shows through as it
        // scrolls beneath, matching the system tab bar's own material.
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        ),
        tabBarStyle: {
          // Deliberately not `position: absolute` — keeping it in normal flow
          // means every screen's content naturally stops above it, so the
          // glass material is free without auditing every scroll inset.
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
          height: 54 + (insets.bottom > 0 ? insets.bottom : 20),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Load',
          tabBarIcon: ({ color }) => <TabIcon name="plus-square" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reverse"
        options={{
          title: 'Reverse',
          tabBarIcon: ({ color }) => <TabIcon name="exchange" color={color} />,
        }}
      />
      <Tabs.Screen
        name="warmup"
        options={{
          title: 'Warmup',
          tabBarIcon: ({ color }) => <TabIcon name="fire" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => <TabIcon name="list-ul" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <TabIcon name="calculator" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
