import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { appendKey, convertWeight, formatWeight, parseKeypad, type Rounding, type Unit } from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore } from '../src/store/useAppStore';
import { theme } from '../src/theme';

export default function ConvertScreen() {
  const storeRounding = useAppStore((state) => state.rounding);
  const [from, setFrom] = useState<Unit>('lb');
  const [raw, setRaw] = useState('315');
  const [rounding, setRounding] = useState<Rounding>(storeRounding);
  const value = parseKeypad(raw);
  const other = from === 'lb' ? 'kg' : 'lb';
  const converted = useMemo(() => convertWeight(value, from, other), [value, from, other]);

  return (
    <Screen
      title="Converter"
      subtitle="LB and KG, same keypad"
      footer={<Keypad onKey={(key) => setRaw((current) => appendKey(current, key))} onClear={() => setRaw('')} />}
    >
      <View style={styles.card}>
        <Text style={styles.from}>{formatWeight(value, from, rounding)}</Text>
        <Pressable
          onPress={() => {
            void tick('medium');
            setFrom(other);
            setRaw(String(Number(converted.toFixed(4))));
          }}
          style={styles.swap}
        >
          <Text style={styles.swapText}>Swap</Text>
        </Pressable>
        <Text style={styles.to}>{formatWeight(converted, other, rounding)}</Text>
      </View>
      <Segmented
        value={String(rounding)}
        options={[
          { value: '0', label: '0' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
        ]}
        onChange={(value) => setRounding(Number(value) as Rounding)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  from: {
    color: theme.text,
    fontSize: 36,
    fontWeight: '800',
  },
  to: {
    color: theme.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  swap: {
    alignSelf: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  swapText: {
    color: theme.text,
    fontWeight: '700',
  },
});
