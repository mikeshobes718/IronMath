import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
import { barPickerOptions, barPickerValue, collarPickerOptions, collarPickerValue } from '../../src/components/equipmentCopy';
import { LogSetSheet } from '../../src/components/LogSetSheet';
import { Numpad } from '../../src/components/Numpad';
import { OpenOnGlassesButton } from '../../src/components/OpenOnGlassesButton';
import { PickerRow } from '../../src/components/PickerRow';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { useKeypad } from '../../src/components/useKeypad';
import { tick } from '../../src/haptics/feedback';
import {
  appendKey,
  barWeight,
  bumpTargetRaw,
  collarWeight,
  formatRestClock,
  formatWeight,
  liftTitle,
  missInputCopy,
  parseKeypad,
  prCopy,
  rawForUnitChange,
  solveTargetLoad,
  targetLoadNeighbors,
  type LoadNeighbor,
  type Unit,
} from '../../src/engine';
import { useActiveGym, useAppStore, useInventory } from '../../src/store/useAppStore';
import { cardShadow, glowShadow, radius, space } from '../../src/theme';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';
import { useRestTimer } from '../../src/wearables/restTimer';

const GYM_PLATE_OPTIONS: Array<{ id: Unit; label: string }> = [
  { id: 'kg', label: 'Kilos. What most commercial gyms have.' },
  { id: 'lb', label: 'Pounds. US plates.' },
];

const BUMP_STEP = 2.5;

export default function LoadBarScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const gymUnit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const loadBias = useAppStore((state) => state.loadBias);
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
  const [logOpen, setLogOpen] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);

  const styles = useThemedStyles((t) => ({
    content: { paddingBottom: 28 },
    hero: { gap: 6, marginBottom: space.md },
    heroHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    unitSeg: { width: 124 },
    kicker: {
      color: t.muted,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inputWrap: { flex: 1, borderBottomWidth: 2, paddingBottom: 4 },
    inputIdle: { borderBottomColor: 'transparent' },
    inputActive: { borderBottomColor: t.accent },
    input: {
      color: t.text,
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -1.8,
    },
    bump: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bumpOff: { opacity: 0.35 },
    bumpText: { color: t.text, fontSize: 24, fontWeight: '700', lineHeight: 28 },

    answer: {
      backgroundColor: t.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 4,
      marginBottom: 12,
    },
    answerKicker: {
      color: t.accent,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    answerValue: {
      color: t.accent,
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -1.4,
    },
    answerOther: { color: t.muted, fontSize: 15, fontWeight: '600' },
    off: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    offExact: { color: t.success },
    offMiss: { color: t.danger },

    nearby: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    near: {
      flex: 1,
      backgroundColor: t.card,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 2,
      minHeight: 58,
      justifyContent: 'center',
    },
    nearLabel: { color: t.dim, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    nearValue: { color: t.text, fontSize: 17, fontWeight: '800' },

    barCard: { marginBottom: 16, borderRadius: radius.xl, overflow: 'hidden' },

    logBtn: {
      minHeight: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      marginBottom: 10,
    },
    logLabel: { color: t.accentText, fontSize: 17, fontWeight: '800' },
    loggedNote: { color: t.success, fontSize: 13, fontWeight: '700', marginBottom: 10, textAlign: 'center' },

    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    quick: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: radius.pill,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 12,
    },
    quickLabel: { color: t.text, fontSize: 15, fontWeight: '700' },
    quickLive: { color: t.accent, fontVariant: ['tabular-nums' as const] },

    pickers: {
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
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
        bias: loadBias,
      }),
    [target, inputUnit, gymUnit, bar, collars, inventory, loadBias]
  );
  const neighbors = useMemo(
    () =>
      result.solution.exact
        ? { lighter: null, heavier: null }
        : targetLoadNeighbors({ target, inputUnit, gymUnit, bar, collars, inventory, bias: loadBias }),
    [result.solution.exact, target, inputUnit, gymUnit, bar, collars, inventory, loadBias]
  );
  const off = missInputCopy(result.deltaInput, inputUnit);
  const otherUnit: Unit = gymUnit === 'kg' ? 'lb' : 'kg';
  const otherLoaded = gymUnit === 'kg' ? result.loadedLb : result.loadedKg;
  const showNearby = !result.solution.exact && (neighbors.lighter !== null || neighbors.heavier !== null);

  const switchInputUnit = (next: Unit) => {
    if (next === inputUnit) {
      return;
    }
    if (target > 0) {
      setTargetRaw(rawForUnitChange(target, inputUnit, next));
    }
    setInputUnit(next);
  };

  const bump = (delta: number) => {
    void tick('light');
    setLogged(null);
    setTargetRaw(bumpTargetRaw(targetRaw, delta));
  };

  const snapTo = (neighbor: LoadNeighbor) => {
    void tick('medium');
    setLogged(null);
    setTargetRaw(String(Number(neighbor.inInputUnit.toFixed(1))));
  };

  return (
    <Screen
      title="Load"
      subtitle={gym.name}
      scroll={false}
      glow
      onDismiss={keypad.hide}
      footer={
        <Numpad
          mode="overlay"
          visible={keypad.open}
          onDone={keypad.hide}
          onKey={(key) => {
            setLogged(null);
            setTargetRaw(appendKey(targetRaw, key));
          }}
          onClear={() => setTargetRaw('')}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        // The native tab bar insets the scrollable area itself (see Screen).
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={keypad.hide}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
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
          <View style={styles.heroRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Target weight ${targetRaw || 0} ${inputUnit}. Opens the number pad.`}
              onPress={() => {
                void tick('light');
                keypad.show();
              }}
              style={[styles.inputWrap, keypad.open ? styles.inputActive : styles.inputIdle]}
            >
              <Text style={styles.input}>{targetRaw || '0'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Down ${BUMP_STEP} ${inputUnit}`}
              disabled={target <= 0}
              hitSlop={6}
              onPress={() => bump(-BUMP_STEP)}
              style={[styles.bump, target <= 0 && styles.bumpOff]}
            >
              <Text style={styles.bumpText}>−</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Up ${BUMP_STEP} ${inputUnit}`}
              hitSlop={6}
              onPress={() => bump(BUMP_STEP)}
              style={styles.bump}
            >
              <Text style={styles.bumpText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.answer, cardShadow(theme.bg, 0.35)]}>
          <Text style={styles.answerKicker}>Load on the bar</Text>
          <Text style={styles.answerValue}>{formatWeight(result.solution.loaded, gymUnit, rounding)}</Text>
          <Text style={styles.answerOther}>{formatWeight(otherLoaded, otherUnit, rounding)}</Text>
          <Text style={[styles.off, off === 'Exact' ? styles.offExact : styles.offMiss]}>{off}</Text>
        </View>

        {showNearby ? (
          <View style={styles.nearby}>
            {neighbors.lighter ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Next weight down, ${formatWeight(neighbors.lighter.loaded, gymUnit, rounding)}`}
                onPress={() => snapTo(neighbors.lighter!)}
                style={styles.near}
              >
                <Text style={styles.nearLabel}>Next down</Text>
                <Text style={styles.nearValue}>{formatWeight(neighbors.lighter.loaded, gymUnit, rounding)}</Text>
              </Pressable>
            ) : null}
            {neighbors.heavier ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Next weight up, ${formatWeight(neighbors.heavier.loaded, gymUnit, rounding)}`}
                onPress={() => snapTo(neighbors.heavier!)}
                style={styles.near}
              >
                <Text style={styles.nearLabel}>Next up</Text>
                <Text style={styles.nearValue}>{formatWeight(neighbors.heavier.loaded, gymUnit, rounding)}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.barCard}>
          <BarbellSleeve plates={result.solution.plates} plateTheme={plateTheme} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log this set"
          onPress={() => {
            void tick('medium');
            keypad.hide();
            setLogOpen(true);
          }}
          style={[styles.logBtn, glowShadow(theme.accent, 0.4)]}
        >
          <Text style={styles.logLabel}>Log set</Text>
        </Pressable>
        {logged ? <Text style={styles.loggedNote}>{logged}</Text> : null}

        <OpenOnGlassesButton view="load" filled onOpen={keypad.hide} />

        <View style={styles.quickRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rest timer, ${formatRestClock(rest.remainingSec)}`}
            onPress={() => {
              void tick('light');
              keypad.hide();
              router.push('/rest' as Href);
            }}
            style={styles.quick}
          >
            <FontAwesome name="clock-o" size={15} color={rest.phase === 'running' ? theme.accent : theme.muted} />
            <Text style={[styles.quickLabel, rest.phase === 'running' && styles.quickLive]}>
              {formatRestClock(rest.remainingSec)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gym glance for glasses and lock screen"
            onPress={() => {
              void tick('light');
              keypad.hide();
              router.push('/glance' as Href);
            }}
            style={styles.quick}
          >
            <FontAwesome name="eye" size={15} color={theme.muted} />
            <Text style={styles.quickLabel}>Glance</Text>
          </Pressable>
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
      </ScrollView>

      <LogSetSheet
        visible={logOpen}
        weight={result.solution.loaded}
        unit={gymUnit}
        onClose={() => setLogOpen(false)}
        onLogged={(entry, records) => {
          const record = prCopy(records);
          setLogged(record ?? `Logged ${liftTitle(entry.liftId)} ${entry.reps} reps.`);
        }}
      />
    </Screen>
  );
}
