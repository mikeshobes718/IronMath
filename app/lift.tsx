import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BarbellSleeve } from '../src/components/BarbellSleeve';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import {
  appendKey,
  barWeight,
  collarWeight,
  convertWeight,
  estimateOneRm,
  formatWeight,
  isLiftId,
  liftTitle,
  loadFromRpe,
  parseKeypad,
  rawForUnitChange,
  solveTargetLoad,
  type Unit,
} from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore, useInventoryFor } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function LiftScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = isLiftId(params.id) ? params.id : 'squat';
  const gymUnit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const barId = useAppStore((state) => state.barId);
  const customBarGym = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const lift = useAppStore((state) => state.lifts[id]);
  const setLiftWorking = useAppStore((state) => state.setLiftWorking);
  const setLiftUnit = useAppStore((state) => state.setLiftUnit);
  const setLiftReps = useAppStore((state) => state.setLiftReps);
  const setWarmupSeed = useAppStore((state) => state.setWarmupSeed);
  const [field, setField] = useState<'weight' | 'reps'>('weight');
  const [rpeRaw, setRpeRaw] = useState('8');
  const keypad = useKeypad();
  const unit: Unit = lift?.unit ?? 'lb';
  const inventory = useInventoryFor(unit);
  const workingRaw = lift?.working ?? '0';
  const repsRaw = lift?.reps ?? '5';
  const working = parseKeypad(workingRaw);
  const reps = parseKeypad(repsRaw) || 1;
  const oneRm = estimateOneRm(working, reps);
  const rpe = Math.min(10, Math.max(6, parseKeypad(rpeRaw) || 8));
  const rpeLoad = loadFromRpe(oneRm.average, Math.min(12, Math.max(1, Math.round(reps))), rpe);
  const customBar = convertWeight(customBarGym, gymUnit, unit);
  const bar = barWeight(barId, unit, customBar);
  const collars = collarWeight(collarId, unit);
  const loaded = useMemo(
    () =>
      solveTargetLoad({
        target: working,
        inputUnit: unit,
        gymUnit: unit,
        bar,
        collars,
        inventory,
      }),
    [working, unit, bar, collars, inventory]
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
    row: { flexDirection: 'row', gap: 10 },
    field: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    fieldOn: { borderColor: theme.accent },
    fieldLabel: { color: theme.muted, fontWeight: '700', fontSize: 12 },
    fieldValue: { color: theme.text, fontWeight: '800', fontSize: 22, marginTop: 4 },
    answer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    answerKicker: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    answerValue: {
      color: theme.accent,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -1,
    },
    meta: { color: theme.muted, fontSize: 14, fontWeight: '600' },
    warmup: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 16,
      alignItems: 'center',
    },
    warmupText: { color: theme.text, fontSize: 17, fontWeight: '700' },
  }));

  const switchUnit = (next: Unit) => {
    if (next === unit) {
      return;
    }
    if (working > 0) {
      setLiftWorking(id, rawForUnitChange(working, unit, next));
    }
    setLiftUnit(id, next);
  };

  return (
    <Screen
      embedded
      hint={`Type your ${liftTitle(id).toLowerCase()}. We load plates from it, estimate a max, and keep the number after you close the app.`}
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => {
            if (field === 'weight') {
              setLiftWorking(id, appendKey(workingRaw, key));
            } else {
              setLiftReps(id, appendKey(repsRaw, key, 2));
            }
          }}
          onClear={() => (field === 'weight' ? setLiftWorking(id, '') : setLiftReps(id, ''))}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${liftTitle(id)} weight. Opens the keypad.`}
        onPress={() => {
          void tick('light');
          setField('weight');
          keypad.show();
        }}
        style={styles.hero}
      >
        <View style={styles.heroHead}>
          <Text style={styles.kicker}>{liftTitle(id)}</Text>
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
        <Text style={styles.input}>{workingRaw || '0'}</Text>
      </Pressable>

      <BarbellSleeve plates={loaded.solution.plates} plateTheme={plateTheme} />
      <Text style={styles.meta}>
        Closest load {formatWeight(loaded.solution.loaded, unit, rounding)}
      </Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reps. Opens the keypad."
          onPress={() => {
            void tick('light');
            setField('reps');
            keypad.show();
          }}
          style={[styles.field, field === 'reps' && styles.fieldOn]}
        >
          <Text style={styles.fieldLabel}>Reps</Text>
          <Text style={styles.fieldValue}>{repsRaw || '1'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="RPE. Tap to change."
          onPress={() => {
            void tick('light');
            const steps = [6, 7, 8, 9, 10];
            const index = steps.indexOf(rpe);
            setRpeRaw(String(steps[(index + 1) % steps.length]));
          }}
          style={styles.field}
        >
          <Text style={styles.fieldLabel}>RPE</Text>
          <Text style={styles.fieldValue}>{rpe}</Text>
        </Pressable>
      </View>

      <View style={styles.answer}>
        <Text style={styles.answerKicker}>Estimated max</Text>
        <Text style={styles.answerValue}>{formatWeight(oneRm.average, unit, rounding)}</Text>
        <Text style={styles.meta}>
          {rpeLoad == null
            ? 'RPE needs 1 to 12 reps and 6 to 10.'
            : `At RPE ${rpe} load ${formatWeight(rpeLoad, unit, rounding)}`}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Warm-Up with this weight"
        onPress={() => {
          void tick('medium');
          setWarmupSeed({ raw: workingRaw || '0', unit });
          router.navigate('/(tabs)/warmup');
        }}
        style={styles.warmup}
      >
        <Text style={styles.warmupText}>Warm up to this</Text>
      </Pressable>
    </Screen>
  );
}
