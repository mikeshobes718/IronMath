import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { theme } from '../theme';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
] as const;

type Props = {
  onKey: (key: string) => void;
  onClear?: () => void;
};

export function Keypad({ onKey, onClear }: Props) {
  return (
    <View style={styles.wrap}>
      {onClear ? (
        <Pressable
          onPress={() => {
            void tick('medium');
            onClear();
          }}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
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

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: '#3F3F46',
  },
  label: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '600',
  },
  clear: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
