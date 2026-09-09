import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { useThemedStyles } from '../theme/useThemedStyles';

type Chip = { id: string; label: string };

type Props = {
  items: Chip[];
  selected: string;
  onSelect: (id: string) => void;
};

export function ChipRow({ items, selected, onSelect }: Props) {
  const styles = useChipStyles();
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              void tick('light');
              onSelect(item.id);
            }}
            style={[styles.chip, active && styles.active]}
          >
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
              style={[styles.label, active && styles.activeLabel]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PlateChipProps = {
  label: string;
  color: string;
  textColor: string;
  disabled?: boolean;
  onPress: () => void;
};

export function PlateChip({ label, color, textColor, disabled, onPress }: PlateChipProps) {
  const styles = useChipStyles();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void tick('medium');
        onPress();
      }}
      style={[styles.plate, { backgroundColor: color, opacity: disabled ? 0.35 : 1 }]}
    >
      <Text style={[styles.plateLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function PlateChipGrid({ children }: { children: ReactNode }) {
  const styles = useChipStyles();
  return <View style={styles.grid}>{children}</View>;
}

function useChipStyles() {
  return useThemedStyles((theme) => ({
    row: {
      flexDirection: 'row' as const,
      flexWrap: 'nowrap' as const,
      alignItems: 'stretch' as const,
      gap: 6,
      paddingVertical: 2,
    },
    chip: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    active: { backgroundColor: theme.accent, borderColor: theme.accent },
    label: { color: theme.muted, fontSize: 13, fontWeight: '700' as const },
    activeLabel: { color: theme.accentText },
    grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    plate: {
      minWidth: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 10,
    },
    plateLabel: { fontWeight: '800' as const, fontSize: 13 },
  }));
}
