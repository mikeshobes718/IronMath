import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Keypad } from '../../src/components/Keypad';
import { Screen } from '../../src/components/Screen';
import { appendKey, englishBreakdown, formatWeight, parseKeypad, warmupLadder } from '../../src/engine';
import { useAppStore, useInventory } from '../../src/store/useAppStore';
import { theme } from '../../src/theme';

export default function WarmupScreen() {
  const unit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const barId = useAppStore((state) => state.barId);
  const customBar = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const inventory = useInventory();
  const [raw, setRaw] = useState(unit === 'lb' ? '315' : '140');
  const working = parseKeypad(raw);

  const sets = useMemo(
    () =>
      warmupLadder({
        workingWeight: working,
        barId,
        customBar,
        collarId,
        unit,
        inventory,
      }),
    [working, barId, customBar, collarId, unit, inventory]
  );

  return (
    <Screen
      title="Warm-Up Ramp"
      subtitle={`Working set ${formatWeight(working, unit, rounding)}`}
      footer={
        <Keypad
          onKey={(key) => setRaw((current) => appendKey(current, key))}
          onClear={() => setRaw('')}
        />
      }
    >
      {sets.map((set) => (
        <View key={set.label} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{set.label}</Text>
            <Text style={styles.weight}>{formatWeight(set.solution.loaded, unit, rounding)}</Text>
          </View>
          <Text style={styles.swap}>{set.swap.copy}</Text>
          <Text style={styles.math}>
            {englishBreakdown(
              set.solution.bar,
              set.solution.collars,
              set.solution.plates,
              set.solution.loaded,
              unit
            )}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: theme.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  weight: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 18,
  },
  swap: {
    color: theme.text,
    fontSize: 14,
  },
  math: {
    color: theme.muted,
    fontSize: 12,
  },
});
