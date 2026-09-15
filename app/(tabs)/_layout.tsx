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
  // Clearance for the home indicator without reserving the whole safe area.
  // Floors at 10 so devices with no indicator still get a little breathing room.
  const tabBarBottomInset = insets.bottom > 0 ? Math.max(insets.bottom - 12, 10) : 10;
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
          //
          // BottomTabBar defaults to a 49pt bar plus the full 34pt home
          // indicator inset as bottom padding, which leaves the labels
          // floating ~39pt above the bottom edge — a dead band that reads as
          // broken next to iOS 26's own compact tab bars. The indicator only
          // needs clearance, not the whole inset: native bars sit their labels
          // around 20pt up, so reserve that much and keep height in step with
          // it (height = content + padding, the same formula the library uses)
          // so the icons stay centred in what is actually rendered.
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          paddingTop: 6,
          paddingBottom: tabBarBottomInset,
          height: 49 + tabBarBottomInset,
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
