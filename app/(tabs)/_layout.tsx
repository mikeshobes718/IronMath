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

/**
 * Inset of the capsule from the screen edges.
 *
 * Measured, not guessed: painting the capsule a flat colour and reading the
 * pixel bounds off a simulator screenshot gives exactly 40pt on each side —
 * 322 of 402pt, 80.1% of screen width — which matches the proportion of the
 * system pill bars this is modelled on.
 * Note that left/right on tabBarStyle are ignored by the navigator — the
 * inset has to come from padding here plus a matching margin on the capsule.
 */
const CAPSULE_MARGIN = 40;

const styles = StyleSheet.create({
  /* The shadow and the clip have to be separate layers. boxShadow is painted
     from the view's border box, so it belongs on a view that is the capsule's
     size: hung off tabBarStyle instead, it drew a shadow the full width of the
     screen (measured: a dark band from 0 to 401.7pt under a capsule spanning
     40-362pt). Invisible on a near-black page, a wide grey bar on a light one.
     A view cannot both cast an outer shadow and clip its children here, hence
     the wrapper. */
  capsuleShadow: {
    marginHorizontal: CAPSULE_MARGIN,
    borderRadius: radius.pill,
  },
  capsuleClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  /* Drawn outside the clip so the stroke is not sliced in half. In light mode
     the capsule is white-on-white against the cards that scroll under it, and
     the blur alone does not separate them — this edge is what makes it read as
     a floating object rather than part of the content below. */
  capsuleEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
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
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.capsuleShadow,
              // 0.55 black is right over a near-black page and far too heavy
              // over a light one, where it reads as dirt rather than depth.
              cardShadow('#000000', scheme === 'dark' ? 0.55 : 0.16),
            ]}
          >
            <View style={styles.capsuleClip}>
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
            <View pointerEvents="none" style={[styles.capsuleEdge, { borderColor: theme.borderStrong }]} />
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
          // No borderRadius and no shadow here: this container is the full
          // width of the screen, so anything painted on it paints that wide.
          // Both belong to the capsule inside tabBarBackground.
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 0,
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
