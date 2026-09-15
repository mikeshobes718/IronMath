import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Numpad } from '../src/components/Numpad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import {
  appendKey,
  barWeight,
  collarWeight,
  convertWeight,
  formatWeight,
  loadablePercentChart,
  parseKeypad,
  rawForUnitChange,
  type Unit,
} from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore, useInventoryFor } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function PercentScreen() {
  const rounding = useAppStore((state) => state.rounding);
  const raw = useAppStore((state) => state.percentRaw);
  const unit = useAppStore((state) => state.percentUnit);
  const setPercentRaw = useAppStore((state) => state.setPercentRaw);
  const setPercentUnit = useAppStore((state) => state.setPercentUnit);
  const gymUnit = useAppStore((state) => state.unit);
  const loadBias = useAppStore((state) => state.loadBias);
  const barId = useAppStore((state) => state.barId);
  const customBarGym = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const inventory = useInventoryFor(unit);
  const keypad = useKeypad();
  const oneRm = parseKeypad(raw);
  const bar = barWeight(barId, unit, convertWeight(customBarGym, gymUnit, unit));
  const collars = collarWeight(collarId, unit);
  const rows = useMemo(
    () => loadablePercentChart({ oneRm, bar, collars, unit, inventory, bias: loadBias }),
    [oneRm, bar, collars, unit, inventory, loadBias]
  );
  const styles = useThemedStyles((theme) => ({
    hero: { gap: 4, marginBottom: space.md },
    heroHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    unitSeg: { width: 128 },
    kicker: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    input: {
      color: theme.text,
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
    table: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden' as const,
    },
    row: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowLast: { borderBottomWidth: 0 },
    pct: { color: theme.muted, fontSize: 15, fontWeight: '700', width: 46 },
    right: { alignItems: 'flex-end' as const, gap: 2 },
    weight: { color: theme.text, fontSize: 17, fontWeight: '800' },
    loadable: { color: theme.muted, fontSize: 12, fontWeight: '700' },
    loadableOff: { color: theme.accent },
  }));

  const switchUnit = (next: Unit) => {
    if (next === unit) {
      return;
    }
    if (oneRm > 0) {
      setPercentRaw(rawForUnitChange(oneRm, unit, next));
    }
    setPercentUnit(next);
  };

  return (
    <Screen
      embedded
      onDismiss={keypad.hide}
      footer={
        <Numpad
          mode="overlay"
          visible={keypad.open}
          onDone={keypad.hide}
          onKey={(key) => setPercentRaw(appendKey(raw, key))}
          onClear={() => setPercentRaw('')}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="One-rep max. Opens the keypad."
        onPress={() => {
          void tick('light');
          keypad.show();
        }}
        style={styles.hero}
      >
        <View style={styles.heroHead}>
          <Text style={styles.kicker}>Your max</Text>
          <View style={styles.unitSeg}>
            <Segmented
              value={unit}
              options={[
                { value: 'lb', label: 'LB' },
                { value: 'kg', label: 'KG' },
              ]}
              onChange={switchUnit}
            />
          </View>
        </View>
        <Text style={styles.input}>{raw || '0'}</Text>
      </Pressable>
      <View style={styles.table}>
        {rows.map((row, index) => (
          <View
            key={row.percent}
            accessible
            accessibilityLabel={`${row.percent} percent is ${formatWeight(row.weight, unit, rounding)}.${
              row.exact ? '' : ` Closest bar is ${formatWeight(row.loaded, unit, rounding)}.`
            }`}
            style={[styles.row, index === rows.length - 1 && styles.rowLast]}
          >
            <Text style={styles.pct}>{row.percent}%</Text>
            <View style={styles.right}>
              <Text style={styles.weight}>{formatWeight(row.weight, unit, rounding)}</Text>
              <Text style={[styles.loadable, !row.exact && styles.loadableOff]}>
                {row.exact ? 'Loads exactly' : `Bar: ${formatWeight(row.loaded, unit, rounding)}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
