import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
import { Keypad } from '../../src/components/Keypad';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { useKeypad } from '../../src/components/useKeypad';
import {
  appendKey,
  barWeight,
  collarWeight,
  convertWeight,
  englishBreakdown,
  formatWeight,
  parseKeypad,
  rawForUnitChange,
  warmupLadder,
  type Unit,
  type WarmupSet,
} from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useAppStore, useInventoryFor } from '../../src/store/useAppStore';
import { space } from '../../src/theme';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';

export default function WarmupScreen() {
  const gymUnit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const barId = useAppStore((state) => state.barId);
  const customBarGym = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const warmupSeed = useAppStore((state) => state.warmupSeed);
  const setWarmupSeed = useAppStore((state) => state.setWarmupSeed);
  const [displayUnit, setDisplayUnit] = useState<Unit>('lb');
  const [raw, setRaw] = useState('225');
  const [picked, setPicked] = useState<WarmupSet | null>(null);
  const keypad = useKeypad();
  const theme = useThemeColors();
  const params = useLocalSearchParams<{ rung?: string; unit?: string }>();
  const inventory = useInventoryFor(displayUnit);
  const customBar = convertWeight(customBarGym, gymUnit, displayUnit);
  const bar = barWeight(barId, displayUnit, customBar);
  const collars = collarWeight(collarId, displayUnit);

  useEffect(() => {
    if (!warmupSeed) {
      return;
    }
    setRaw(warmupSeed.raw);
    setDisplayUnit(warmupSeed.unit);
    setWarmupSeed(null);
  }, [warmupSeed, setWarmupSeed]);

  useEffect(() => {
    if (params.unit !== 'lb' && params.unit !== 'kg') {
      return;
    }
    setDisplayUnit(params.unit);
    setRaw(params.unit === 'kg' ? '100' : '225');
  }, [params.unit]);
  const styles = useThemedStyles((theme) => ({
    column: { flex: 1 },
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
    working: {
      color: theme.text,
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
    dual: { color: theme.muted, fontSize: 15, fontWeight: '600' },
    ladder: { flex: 1 },
    ladderContent: { paddingBottom: 16, gap: 12 },
    row: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pct: {
      width: 52,
      color: theme.muted,
      fontSize: 15,
      fontWeight: '800',
    },
    rowCopy: { flex: 1, gap: 4 },
    weight: {
      color: theme.accent,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    action: { color: theme.text, fontSize: 15, fontWeight: '600' },
    fromLast: { color: theme.muted, fontSize: 13, fontWeight: '600' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 12,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    sheetTitle: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '800',
    },
    sheetWeight: {
      color: theme.accent,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.6,
      marginTop: 2,
    },
    close: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    math: { color: theme.muted, fontSize: 15, fontWeight: '600' },
    closeBtn: {
      marginTop: 4,
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    closeBtnText: { color: theme.text, fontSize: 17, fontWeight: '700' },
  }));

  const target = parseKeypad(raw);

  const sets = useMemo(
    () =>
      warmupLadder({
        workingWeight: target,
        barId,
        customBar,
        collarId,
        unit: displayUnit,
        inventory,
      }),
    [target, barId, customBar, collarId, displayUnit, inventory]
  );

  const topSet = sets.find((set) => set.percent === 1) ?? sets[sets.length - 1];
  const topShown = topSet
    ? formatWeight(topSet.solution.loaded, displayUnit, rounding)
    : formatWeight(target, displayUnit, rounding);

  useEffect(() => {
    if (params.rung == null || sets.length === 0) {
      return;
    }
    const index = Number(params.rung);
    if (Number.isFinite(index) && sets[index]) {
      setPicked(sets[index]);
    }
  }, [params.rung, sets]);

  const showWeight = (set: WarmupSet) =>
    set.percent === 1
      ? topShown
      : formatWeight(set.solution.loaded, displayUnit, rounding);

  const actionFor = (set: WarmupSet) => set.swap.thisSet;

  const switchDisplayUnit = (next: Unit) => {
    if (next === displayUnit) {
      return;
    }
    if (target > 0) {
      setRaw(rawForUnitChange(target, displayUnit, next));
    }
    setDisplayUnit(next);
  };

  const openRung = (set: WarmupSet) => {
    void tick('medium');
    keypad.hide();
    setPicked(set);
  };

  const closeRung = () => setPicked(null);

  return (
    <Screen
      title="Warm-Up"
      subtitle="Lighter sets first"
      hint="Warm up to your top set. We spread it into lighter sets first. Tap a set to see the bar."
      scroll={false}
      onDismiss={keypad.hide}
      footer={
        <Keypad
          aboveTabBar
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => setRaw((current) => appendKey(current, key))}
          onClear={() => setRaw('')}
        />
      }
    >
      <View style={styles.column}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Top set weight. Opens the keypad."
          onPress={() => {
            void tick('light');
            keypad.show();
          }}
          style={styles.hero}
        >
          <View style={styles.heroHead}>
            <Text style={styles.kicker}>Top set</Text>
            <View style={styles.unitSeg}>
              <Segmented
                value={displayUnit}
                options={[
                  { value: 'lb', label: 'LB' },
                  { value: 'kg', label: 'KG' },
                ]}
                onChange={switchDisplayUnit}
              />
            </View>
          </View>
          <Text style={styles.working}>{raw || '0'}</Text>
          <Text style={styles.dual}>{topShown}</Text>
        </Pressable>

        <ScrollView
          style={styles.ladder}
          contentContainerStyle={styles.ladderContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={keypad.hide}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {sets.map((set) => {
            const shown = showWeight(set);
            return (
              <Pressable
                key={set.label}
                accessibilityRole="button"
                accessibilityLabel={`${set.label}, ${shown}. ${actionFor(set)}. ${set.swap.fromLast ?? ''} Shows the bar.`}
                onPress={() => openRung(set)}
                style={styles.row}
              >
                <Text style={styles.pct}>{set.label}</Text>
                <View style={styles.rowCopy}>
                  <Text style={styles.weight}>{shown}</Text>
                  <Text style={styles.action}>{actionFor(set)}</Text>
                  {set.swap.fromLast ? (
                    <Text style={styles.fromLast}>{set.swap.fromLast}</Text>
                  ) : null}
                </View>
                <FontAwesome name="chevron-right" size={14} color={theme.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={closeRung}>
        <Pressable style={styles.backdrop} onPress={closeRung}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {picked ? (
              <>
                <View style={styles.sheetHead}>
                  <View>
                    <Text style={styles.sheetTitle}>{picked.label}</Text>
                    <Text style={styles.sheetWeight}>{showWeight(picked)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={closeRung}
                    style={styles.close}
                  >
                    <FontAwesome name="times" size={16} color={theme.muted} />
                  </Pressable>
                </View>
                <BarbellSleeve plates={picked.solution.plates} plateTheme={plateTheme} />
                <Text style={styles.math}>
                  {englishBreakdown(
                    bar,
                    collars,
                    picked.solution.plates,
                    picked.percent === 1 ? topSet?.solution.loaded ?? picked.solution.loaded : picked.solution.loaded,
                    displayUnit
                  )}
                </Text>
                <Text style={styles.math}>{actionFor(picked)}</Text>
                {picked.swap.fromLast ? (
                  <Text style={styles.fromLast}>{picked.swap.fromLast}</Text>
                ) : null}
                <Pressable onPress={closeRung} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
