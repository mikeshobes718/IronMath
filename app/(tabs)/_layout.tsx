import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT, floatingTabBarGap } from '../../src/components/useTabBarInset';
import { cardShadow, radius } from '../../src/theme';
import { useResolvedScheme, useThemeColors } from '../../src/theme/ThemeRoot';

function TabIcon(props: { name: ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={19} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const scheme = useResolvedScheme();
  // Sit the bar above the home indicator rather than reserving the whole safe
  // area beneath it — the bar floats, so the gap is the margin, not padding.
  // Shared with useTabBarInset so screens clear the capsule *and* this gap.
  const bottomGap = floatingTabBarGap(insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.dim,
        // Frosted glass clipped to the capsule. The bar floats over content,
        // so screens add their own bottom inset via BottomTabBarHeightContext
        // (see Screen.tsx) rather than the navigator reserving layout space.
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: scheme === 'dark' ? 'rgba(20,19,22,0.55)' : 'rgba(255,255,255,0.6)' },
            ]}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: bottomGap,
          height: FLOATING_TAB_BAR_HEIGHT,
          borderRadius: radius.pill,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          // Clips the blur to the capsule; without it the material renders
          // square behind the rounded outline.
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 0,
          ...cardShadow(theme.bg, 0.45),
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
