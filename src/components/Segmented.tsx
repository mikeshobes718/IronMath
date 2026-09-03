import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { theme } from '../theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
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
            style={[styles.item, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  item: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  active: {
    backgroundColor: theme.accent,
  },
  label: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  activeLabel: {
    color: theme.accentText,
  },
});
