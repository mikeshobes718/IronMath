import { BlurView } from 'expo-blur';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tick } from '../haptics/feedback';
import { radius } from '../theme';
import { useResolvedScheme, useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
] as const;

type Props = {
  onKey: (key: string) => void;
  onClear?: () => void;
  /**
   * `inline` lives in the layout permanently — for the Load screen, which is a
   * calculator and where the pad is the primary interface, not chrome.
   * `overlay` slides up over content when a field is tapped and leaves on Done.
   */
  mode?: 'inline' | 'overlay';
  /** overlay only: whether the pad is up. */
  visible?: boolean;
  /** overlay only: called by the Done button. */
  onDone?: () => void;
  /** Sits on the left of the accessory bar — a unit toggle, usually. */
  accessory?: ReactNode;
  /** Inline pads inside the tab navigator need less bottom padding. */
  aboveTabBar?: boolean;
};

const SLIDE_DISTANCE = 360;

export function Numpad({
  onKey,
  onClear,
  mode = 'overlay',
  visible = true,
  onDone,
  accessory,
  aboveTabBar = false,
}: Props) {
  const theme = useThemeColors();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(mode === 'inline' || visible ? 1 : 0);

  useEffect(() => {
    if (mode === 'inline') {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 260 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, mode, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SLIDE_DISTANCE }],
    opacity: 0.4 + progress.value * 0.6,
  }));

  const styles = useThemedStyles((t) => ({
    pad: {
      paddingHorizontal: 14,
      paddingTop: 10,
      gap: 8,
    },
    padTint: {
      backgroundColor: scheme === 'dark' ? 'rgba(5,5,6,0.76)' : 'rgba(246,245,242,0.82)',
    },
    accessoryBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      minHeight: 44,
      paddingHorizontal: 2,
      paddingBottom: 6,
    },
    accessorySlot: { flexShrink: 1 },
    barActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    barBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      minHeight: 36,
      justifyContent: 'center' as const,
    },
    clearText: { color: t.muted, fontSize: 16, fontWeight: '700' as const },
    doneBtn: {
      backgroundColor: t.accent,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: radius.pill,
      minHeight: 36,
      justifyContent: 'center' as const,
    },
    doneText: { color: t.accentText, fontSize: 16, fontWeight: '800' as const },
    row: { flexDirection: 'row' as const, gap: 8 },
    key: {
      flex: 1,
      height: 58,
      borderRadius: radius.md,
      backgroundColor: t.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    keyPressed: { backgroundColor: t.borderStrong },
    keyLabel: {
      color: t.text,
      fontSize: 28,
      fontWeight: '500' as const,
    },
    keyGlyph: {
      color: t.text,
      fontSize: 22,
      fontWeight: '600' as const,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border,
    },
  }));

  const padBottom = mode === 'inline' && aboveTabBar ? 8 : Math.max(14, insets.bottom);

  const body = (
    <View style={[styles.pad, mode === 'overlay' && styles.padTint, { paddingBottom: padBottom }]}>
      {(accessory || onClear || mode === 'overlay') && (
        <View style={styles.accessoryBar}>
          <View style={styles.accessorySlot}>{accessory}</View>
          <View style={styles.barActions}>
            {onClear ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear the number"
                onPress={() => {
                  void tick('medium');
                  onClear();
                }}
                style={styles.barBtn}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
            {mode === 'overlay' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={() => {
                  void tick('light');
                  onDone?.();
                }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
      {KEYS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? 'Delete' : key === '.' ? 'Decimal point' : key}
              onPress={() => {
                void tick('light');
                onKey(key);
              }}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={key === 'back' ? styles.keyGlyph : styles.keyLabel}>
                {key === 'back' ? '⌫' : key}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );

  if (mode === 'inline') {
    return <View>{body}</View>;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, animatedStyle]}
    >
      <View style={styles.hairline} />
      <BlurView intensity={95} tint={scheme === 'dark' ? 'dark' : 'light'}>
        {body}
      </BlurView>
    </Animated.View>
  );
}
