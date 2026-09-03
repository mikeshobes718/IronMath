import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { theme } from '../theme';

type Chip = { id: string; label: string };

type Props = {
  items: Chip[];
  selected: string;
  onSelect: (id: string) => void;
};

export function ChipRow({ items, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
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
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  active: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  label: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  activeLabel: {
    color: theme.accentText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plate: {
    minWidth: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  plateLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
});
