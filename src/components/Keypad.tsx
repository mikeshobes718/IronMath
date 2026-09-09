import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tick } from '../haptics/feedback';
import { useThemeColors } from '../theme/ThemeRoot';
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
  aboveTabBar?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Keypad({ onKey, onClear, aboveTabBar = false, open, onOpenChange }: Props) {
  const theme = useThemeColors();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 4,
      backgroundColor: colors.bg,
    },
    chrome: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      minHeight: 36,
    },
    chromeBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 64,
    },
    chromeText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '700' as const,
    },
    collapsed: {
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    showBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 12,
      minHeight: 44,
    },
    showText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '700' as const,
    },
    row: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    key: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pressed: {
      backgroundColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '600' as const,
    },
  }));
  const insets = useSafeAreaInsets();
  const padBottom = aboveTabBar ? 6 : Math.max(18, insets.bottom);

  if (!open) {
    return (
      <View style={[styles.collapsed, { paddingBottom: padBottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show keypad"
          onPress={() => {
            void tick('light');
            onOpenChange(true);
          }}
          style={styles.showBar}
        >
          <FontAwesome name="chevron-up" size={12} color={theme.accent} />
          <Text style={styles.showText}>Show keypad</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingBottom: padBottom }]}>
      <View style={styles.chrome}>
        {onClear ? (
          <Pressable
            onPress={() => {
              void tick('medium');
              onClear();
            }}
            style={styles.chromeBtn}
          >
            <Text style={styles.chromeText}>Clear</Text>
          </Pressable>
        ) : (
          <View style={styles.chromeBtn} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide keypad"
          onPress={() => {
            void tick('light');
            onOpenChange(false);
          }}
          style={styles.chromeBtn}
        >
          <Text style={styles.chromeText}>Hide</Text>
          <FontAwesome name="chevron-down" size={11} color={theme.accent} />
        </Pressable>
      </View>
      {KEYS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                void tick('light');
                onKey(key);
              }}
              style={({ pressed }) => [styles.key, pressed && styles.pressed]}
            >
              <Text style={styles.label}>{key === 'back' ? '⌫' : key}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
