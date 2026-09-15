import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
import { LogSetSheet } from '../../src/components/LogSetSheet';
import { PlateChip, PlateChipGrid } from '../../src/components/Chips';
import { barPickerOptions, barPickerValue, collarPickerOptions, collarPickerValue } from '../../src/components/equipmentCopy';
import { PickerRow } from '../../src/components/PickerRow';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import {
  addPair,
  barWeight,
  canAddPair,
  collarWeight,
  formatWeight,
  liftTitle,
  plateColor,
  platesForUnit,
  prCopy,
  removePairAt,
  totalFromSleeve,
} from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useAppStore, useInventory } from '../../src/store/useAppStore';
import { useThemedStyles } from '../../src/theme/useThemedStyles';

export default function ReverseScreen() {
  const unit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const barId = useAppStore((state) => state.barId);
  const customBar = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const setUnit = useAppStore((state) => state.setUnit);
  const setBarId = useAppStore((state) => state.setBarId);
  const setCollarId = useAppStore((state) => state.setCollarId);
  const inventory = useInventory();
  const plates = useAppStore((state) => state.reversePlates);
  const setPlates = useAppStore((state) => state.setReversePlates);
  const [logOpen, setLogOpen] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);
  const styles = useThemedStyles((theme) => ({
    kicker: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    raw: {
      color: theme.text,
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -1.4,
    },
    pickers: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    clear: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    clearText: { color: theme.danger, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    logBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
    logBtnOff: { opacity: 0.4 },
    logLabel: { color: theme.accentText, fontSize: 16, fontWeight: '800' },
    loggedNote: { color: theme.success, fontSize: 13, fontWeight: '700' },
  }));

  const bar = barWeight(barId, unit, customBar);
  const collars = collarWeight(collarId, unit);
  const loaded = totalFromSleeve(bar, collars, plates);
  const catalog = platesForUnit(unit);

  return (
    <Screen
      title="Reverse"
      subtitle="What is on the bar?"
      hint="Tap plates to add them. Tap one on the bar to take it off."
      glow
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
              setPlates([]);
              setLogged(null);
            }}
          />
        </View>
      }
    >
      <Text style={styles.kicker}>On the bar</Text>
      <Text style={styles.raw}>{formatWeight(loaded, unit, rounding)}</Text>
      <BarbellSleeve
        plates={plates}
        plateTheme={plateTheme}
        emptyLabel="Tap plates below"
        onPlatePress={(index) => {
          setLogged(null);
          setPlates(removePairAt(plates, index));
        }}
      />
      <View style={styles.pickers}>
        <PickerRow
          label="Bar"
          value={barPickerValue(barId, unit, customBar)}
          options={barPickerOptions(unit, customBar)}
          onSelect={setBarId}
        />
        <PickerRow
          label="Collars"
          value={collarPickerValue(collarId, unit)}
          options={collarPickerOptions(unit)}
          onSelect={(id) => setCollarId(id)}
          last
        />
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear the bar"
          onPress={() => {
            void tick('warn');
            setPlates([]);
            setLogged(null);
          }}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear bar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log this set"
          disabled={plates.length === 0}
          onPress={() => {
            void tick('medium');
            setLogOpen(true);
          }}
          style={[styles.logBtn, plates.length === 0 && styles.logBtnOff]}
        >
          <Text style={styles.logLabel}>Log set</Text>
        </Pressable>
      </View>
      {logged ? <Text style={styles.loggedNote}>{logged}</Text> : null}
      <PlateChipGrid>
        {catalog.map((spec) => {
          const color = plateColor(spec, plateTheme);
          const disabled = !canAddPair(inventory, plates, spec.id) || (inventory[spec.id] ?? 0) <= 0;
          return (
            <PlateChip
              key={spec.id}
              label={String(spec.weight)}
              color={color.fill}
              textColor={color.text}
              disabled={disabled}
              onPress={() => {
                setLogged(null);
                setPlates(addPair(plates, spec.id));
              }}
            />
          );
        })}
      </PlateChipGrid>

      <LogSetSheet
        visible={logOpen}
        weight={loaded}
        unit={unit}
        onClose={() => setLogOpen(false)}
        onLogged={(entry, records) => {
          const record = prCopy(records);
          setLogged(record ?? `Logged ${liftTitle(entry.liftId)} ${entry.reps} reps.`);
        }}
      />
    </Screen>
  );
}
