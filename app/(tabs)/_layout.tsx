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

/** Inset of the capsule from the screen edges. */
const CAPSULE_MARGIN = 22;

const styles = StyleSheet.create({
  capsule: {
    marginHorizontal: CAPSULE_MARGIN,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});

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
        // The capsule shape is built here rather than left to the navigator's
        // container. Relying on overflow:hidden on the bar itself did not clip
        // this background — the fill painted the full width of the screen, so
        // what rendered was a wide light band rather than a pill.
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFillObject, styles.capsule]}>
            <BlurView
              intensity={80}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Painted over the blur, not passed to it: BlurView renders its
                material above its own backgroundColor, so tinting it directly
                has no visible effect. The tint is what lifts the capsule clear
                of the page — a near-black pill on a near-black page reads as
                background, not as something floating above it. */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: scheme === 'dark' ? 'rgba(52,49,57,0.72)' : 'rgba(255,255,255,0.82)' },
              ]}
            />
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          // The bar stays full width: left/right are ignored here — the
          // navigator owns those. The capsule is inset from within instead,
          // via paddingHorizontal here and a matching margin on the
          // background below, so the pill and its items line up.
          bottom: bottomGap,
          paddingHorizontal: CAPSULE_MARGIN,
          height: FLOATING_TAB_BAR_HEIGHT,
          borderRadius: radius.pill,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 0,
          ...cardShadow('#000000', 0.55),
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
