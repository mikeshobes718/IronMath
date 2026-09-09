import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { useKeypad } from '../src/components/useKeypad';
import { tick } from '../src/haptics/feedback';
import {
  appendKey,
  barWeight,
  collarWeight,
  englishBreakdown,
  formatWeight,
  parseKeypad,
  planAttempts,
  solveLoad,
} from '../src/engine';
import { BarbellSleeve } from '../src/components/BarbellSleeve';
import { useAppStore, useInventory, useUnitSeed } from '../src/store/useAppStore';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function AttemptsScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const barId = useAppStore((s) => s.barId);
  const customBar = useAppStore((s) => s.customBar);
  const collarId = useAppStore((s) => s.collarId);
  const inventory = useInventory();
  const plateTheme = useAppStore((s) => s.plateTheme);
  const [raw, setRaw] = useUnitSeed('250', '110');
  const keypad = useKeypad();
  const styles = useThemedStyles((theme) => ({
    goal: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    goalLabel: { color: theme.muted, fontWeight: '700', fontSize: 12 },
    goalValue: { color: theme.text, fontWeight: '800', fontSize: 36, letterSpacing: -1 },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 4,
    },
    top: { flexDirection: 'row', justifyContent: 'space-between' },
    name: { color: theme.accent, fontWeight: '800', fontSize: 16 },
    weight: { color: theme.text, fontWeight: '800', fontSize: 18 },
    note: { color: theme.muted, fontSize: 13 },
    math: { color: theme.muted, fontSize: 12 },
  }));
  const goal = parseKeypad(raw);
  const plan = planAttempts(goal);
  const bar = barWeight(barId, unit, customBar);
  const collars = collarWeight(collarId, unit);

  const rows = useMemo(
    () =>
      [
        { name: 'Opener', weight: plan.opener, range: plan.openerRange, note: '90-92%' },
        { name: 'Second', weight: plan.second, range: plan.secondRange, note: '96-98%' },
        { name: 'Third', weight: plan.third, range: plan.thirdRange, note: '100-102%' },
      ].map((row) => ({
        ...row,
        solution: solveLoad({ target: row.weight, bar, collars, unit, inventory }),
      })),
    [plan, bar, collars, unit, inventory],
  );

  return (
    <Screen
      embedded
      hint={`Type the third-attempt goal. IronMath plans an opener, a second, and a third around ${formatWeight(goal, unit, rounding)}, with plate math for each.`}
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => setRaw((c) => appendKey(c, key))}
          onClear={() => setRaw('')}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Third attempt goal. Opens the keypad."
        onPress={() => {
          void tick('light');
          keypad.show();
        }}
        style={styles.goal}
      >
        <Text style={styles.goalLabel}>Third attempt goal</Text>
        <Text style={styles.goalValue}>{raw || '0'}</Text>
      </Pressable>
      {rows.map((row) => (
        <View key={row.name} style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.weight}>{formatWeight(row.solution.loaded, unit, rounding)}</Text>
          </View>
          <Text style={styles.note}>
            {row.note} · range {formatWeight(row.range[0], unit, rounding)} to{' '}
            {formatWeight(row.range[1], unit, rounding)}
          </Text>
          <BarbellSleeve plates={row.solution.plates} plateTheme={plateTheme} compact />
          <Text style={styles.math}>
            {englishBreakdown(row.solution.bar, row.solution.collars, row.solution.plates, row.solution.loaded, unit)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
