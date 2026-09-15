import { Pressable, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { glowShadow, radius } from '../theme';
import { useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const theme = useThemeColors();
  const styles = useThemedStyles((t) => ({
    wrap: {
      flexDirection: 'row' as const,
      backgroundColor: t.card,
      borderRadius: radius.pill,
      padding: 3,
      gap: 3,
    },
    item: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
    },
    active: {
      backgroundColor: t.accent,
    },
    label: {
      color: t.muted,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    activeLabel: {
      color: t.accentText,
    },
  }));
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!active) {
                void tick('light');
                onChange(option.value);
              }
            }}
            style={[styles.item, active && styles.active, active && glowShadow(theme.accent, 0.45)]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
