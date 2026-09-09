import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
import { barPickerOptions, barPickerValue, collarPickerOptions, collarPickerValue } from '../../src/components/equipmentCopy';
import { Keypad } from '../../src/components/Keypad';
import { OpenOnGlassesButton } from '../../src/components/OpenOnGlassesButton';
import { PickerRow } from '../../src/components/PickerRow';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { useKeypad } from '../../src/components/useKeypad';
import { tick } from '../../src/haptics/feedback';
import {
  appendKey,
  barWeight,
  collarWeight,
  formatRestClock,
  formatWeight,
  missInputCopy,
  parseKeypad,
  rawForUnitChange,
  solveTargetLoad,
  type Unit,
} from '../../src/engine';
import { useActiveGym, useAppStore, useInventory } from '../../src/store/useAppStore';
import { space } from '../../src/theme';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';
import { useRestTimer } from '../../src/wearables/restTimer';

const GYM_PLATE_OPTIONS: Array<{ id: Unit; label: string }> = [
  { id: 'kg', label: 'Kilos. What most commercial gyms have.' },
  { id: 'lb', label: 'Pounds. US plates.' },
];

export default function LoadBarScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const gymUnit = useAppStore((state) => state.unit);
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
  const inputUnit = useAppStore((state) => state.loadInputUnit);
  const targetRaw = useAppStore((state) => state.loadTargetRaw);
  const setInputUnit = useAppStore((state) => state.setLoadInputUnit);
  const setTargetRaw = useAppStore((state) => state.setLoadTargetRaw);
  const rest = useRestTimer();
  const keypad = useKeypad();
  const styles = useThemedStyles((theme) => ({
    main: { flex: 1 },
    mainContent: { flexGrow: 1 },
    page: { paddingTop: 4, paddingBottom: 20 },
    hero: { gap: 4, marginBottom: space.lg },
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
    answer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
      marginBottom: 20,
    },
    barCard: { marginBottom: 20 },
    answerKicker: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    answerValue: {
      color: theme.accent,
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: -1.2,
    },
    answerOther: { color: theme.muted, fontSize: 15, fontWeight: '600' },
    off: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    offExact: { color: theme.success },
    offMiss: { color: theme.danger },
    pickers: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    convert: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 20,
      minHeight: 52,
    },
    convertLabel: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800' as const,
    },
    restMeta: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    restTime: {
      color: theme.muted,
      fontSize: 17,
      fontWeight: '800' as const,
      fontVariant: ['tabular-nums' as const],
    },
    restTimeLive: { color: theme.accent },
  }));

  const bar = barWeight(barId, gymUnit, customBar);
  const collars = collarWeight(collarId, gymUnit);
  const target = parseKeypad(targetRaw);
  const result = useMemo(
    () =>
      solveTargetLoad({
        target,
        inputUnit,
        gymUnit,
        bar,
        collars,
        inventory,
      }),
    [target, inputUnit, gymUnit, bar, collars, inventory]
  );
  const off = missInputCopy(result.deltaInput, inputUnit);
  const otherUnit: Unit = gymUnit === 'kg' ? 'lb' : 'kg';
  const otherLoaded = gymUnit === 'kg' ? result.loadedLb : result.loadedKg;

  const switchInputUnit = (next: Unit) => {
    if (next === inputUnit) {
      return;
    }
    if (target > 0) {
      setTargetRaw(rawForUnitChange(target, inputUnit, next));
    }
    setInputUnit(next);
  };

  return (
    <Screen
      title="Load"
      subtitle={gym.name}
      hint="Type the weight from your program or Fitbod. We pick the closest plates your gym has. Open on glasses sends this set to the Display."
      scroll={false}
      onDismiss={keypad.hide}
      footer={
        <Keypad
          aboveTabBar
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => setTargetRaw(appendKey(targetRaw, key))}
          onClear={() => setTargetRaw('')}
        />
      }
    >
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={keypad.hide}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <Pressable
          style={styles.page}
          onPress={() => {
            void tick('light');
            keypad.hide();
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Target weight. Opens the keypad."
            onPress={() => {
              void tick('light');
              keypad.show();
            }}
            style={styles.hero}
          >
            <View style={styles.heroHead}>
              <Text style={styles.kicker}>Target</Text>
              <View style={styles.unitSeg}>
                <Segmented
                  value={inputUnit}
                  options={[
                    { value: 'lb', label: 'LB' },
                    { value: 'kg', label: 'KG' },
                  ]}
                  onChange={switchInputUnit}
                />
              </View>
            </View>
            <Text style={styles.input}>{targetRaw || '0'}</Text>
          </Pressable>

          <View style={styles.answer}>
            <Text style={styles.answerKicker}>Load on the bar</Text>
            <Text style={styles.answerValue}>{formatWeight(result.solution.loaded, gymUnit, rounding)}</Text>
            <Text style={styles.answerOther}>{formatWeight(otherLoaded, otherUnit, rounding)}</Text>
            <Text style={[styles.off, off === 'Exact' ? styles.offExact : styles.offMiss]}>{off}</Text>
          </View>

          <OpenOnGlassesButton view="load" onOpen={keypad.hide} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Convert LB and KG"
            onPress={() => {
              void tick('light');
              keypad.hide();
              router.push('/convert');
            }}
            style={styles.convert}
          >
            <Text style={styles.convertLabel}>Convert LB and KG</Text>
            <FontAwesome name="chevron-right" size={12} color={theme.dim} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gym glance for glasses and lock screen"
            onPress={() => {
              void tick('light');
              keypad.hide();
              router.push('/glance' as Href);
            }}
            style={styles.convert}
          >
            <Text style={styles.convertLabel}>Gym glance</Text>
            <FontAwesome name="chevron-right" size={12} color={theme.dim} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rest timer, ${formatRestClock(rest.remainingSec)}`}
            onPress={() => {
              void tick('light');
              keypad.hide();
              router.push('/rest' as Href);
            }}
            style={styles.convert}
          >
            <Text style={styles.convertLabel}>Rest timer</Text>
            <View style={styles.restMeta}>
              <Text style={[styles.restTime, rest.phase === 'running' && styles.restTimeLive]}>
                {formatRestClock(rest.remainingSec)}
              </Text>
              <FontAwesome name="chevron-right" size={12} color={theme.dim} />
            </View>
          </Pressable>

          <View style={styles.barCard}>
            <BarbellSleeve plates={result.solution.plates} plateTheme={plateTheme} />
          </View>

          <View style={styles.pickers}>
            <PickerRow
              label="Bar"
              value={barPickerValue(barId, gymUnit, customBar)}
              options={barPickerOptions(gymUnit, customBar)}
              onSelect={setBarId}
            />
            <PickerRow
              label="Collars"
              value={collarPickerValue(collarId, gymUnit)}
              options={collarPickerOptions(gymUnit)}
              onSelect={setCollarId}
            />
            <PickerRow
              label="Gym plates"
              value={gymUnit === 'kg' ? 'Kilos' : 'Pounds'}
              options={GYM_PLATE_OPTIONS}
              onSelect={setUnit}
              last
            />
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
