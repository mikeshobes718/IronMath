import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
import { ChipRow } from '../../src/components/Chips';
import { Keypad } from '../../src/components/Keypad';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import {
  BAR_PRESETS,
  COLLARS,
  appendKey,
  barWeight,
  collarWeight,
  englishBreakdown,
  formatDual,
  formatWeight,
  missCopy,
  parseKeypad,
  solveLoad,
} from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useActiveGym, useAppStore, useInventory } from '../../src/store/useAppStore';
import { theme } from '../../src/theme';

const QUICK = ['135', '185', '225', '275', '315', '405'];

export default function LoadBarScreen() {
  const unit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const barId = useAppStore((state) => state.barId);
  const customBar = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const setUnit = useAppStore((state) => state.setUnit);
  const setBarId = useAppStore((state) => state.setBarId);
  const setCollarId = useAppStore((state) => state.setCollarId);
  const gym = useActiveGym();
  const inventory = useInventory();
  const [raw, setRaw] = useState(unit === 'lb' ? '315' : '140');

  const bar = barWeight(barId, unit, customBar);
  const collars = collarWeight(collarId, unit);
  const target = parseKeypad(raw);
  const solution = useMemo(
    () => solveLoad({ target, bar, collars, unit, inventory }),
    [target, bar, collars, unit, inventory]
  );

  const miss = missCopy(solution.delta, unit);

  return (
    <Screen
      title="Load the Bar"
      subtitle={gym.name}
      right={
        <View style={{ width: 132 }}>
          <Segmented
            value={unit}
            options={[
              { value: 'lb', label: 'LB' },
              { value: 'kg', label: 'KG' },
            ]}
            onChange={(next) => {
              setUnit(next);
              setRaw(next === 'lb' ? '315' : '140');
            }}
          />
        </View>
      }
      scroll={false}
      footer={
        <Keypad
          onKey={(key) => setRaw((current) => appendKey(current, key))}
          onClear={() => setRaw('')}
        />
      }
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.raw}>{raw || '0'}</Text>
        <Text style={styles.dual}>{formatDual(solution.loaded, unit, rounding)}</Text>
        <Text style={styles.target}>
          Target {formatWeight(target, unit, rounding)}
        </Text>
        {miss ? <Text style={styles.miss}>{miss}</Text> : <Text style={styles.exact}>Exact load</Text>}

        <BarbellSleeve plates={solution.plates} plateTheme={plateTheme} />

        <Text style={styles.math}>
          {englishBreakdown(solution.bar, solution.collars, solution.plates, solution.loaded, unit)}
        </Text>

        <ChipRow
          selected={barId}
          onSelect={setBarId}
          items={BAR_PRESETS.map((preset) => ({
            id: preset.id,
            label: `${preset.name} ${unit === 'lb' ? preset.lb : preset.kg}`,
          }))}
        />
        <ChipRow
          selected={collarId}
          onSelect={(id) => setCollarId(id as typeof collarId)}
          items={COLLARS.map((collar) => ({
            id: collar.id,
            label: collar.name,
          }))}
        />
        <View style={styles.quick}>
          {QUICK.map((value) => (
            <Text
              key={value}
              style={styles.quickChip}
              onPress={() => {
                void tick('light');
                setRaw(unit === 'lb' ? value : String(Math.round(Number(value) * 0.45359237)));
              }}
            >
              {unit === 'lb' ? value : Math.round(Number(value) * 0.45359237)}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  mainContent: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  raw: {
    color: theme.text,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  dual: {
    color: theme.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  target: {
    color: theme.muted,
    fontSize: 14,
  },
  miss: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  exact: {
    color: theme.success,
    fontSize: 14,
    fontWeight: '700',
  },
  math: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    color: theme.text,
    backgroundColor: theme.surface,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '700',
  },
});
