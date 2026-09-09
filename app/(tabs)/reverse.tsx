import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BarbellSleeve } from '../../src/components/BarbellSleeve';
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
  plateColor,
  platesForUnit,
  removePairAt,
  totalFromSleeve,
  type PlateStackItem,
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
  const [plates, setPlates] = useState<PlateStackItem[]>([]);
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
      borderRadius: 16,
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
  }));

  const bar = barWeight(barId, unit, customBar);
  const collars = collarWeight(collarId, unit);
  const loaded = totalFromSleeve(bar, collars, plates);
  const catalog = platesForUnit(unit);

  return (
    <Screen
      title="Reverse"
      subtitle="What is on the bar?"
      hint="Tap the plates you see. We add them up. Tap a plate on the bar to take that pair off."
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
        onPlatePress={(index) => setPlates((current) => removePairAt(current, index))}
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
      <Pressable
        onPress={() => {
          void tick('warn');
          setPlates([]);
        }}
        style={styles.clear}
      >
        <Text style={styles.clearText}>Clear bar</Text>
      </Pressable>
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
              onPress={() => setPlates((current) => addPair(current, spec.id))}
            />
          );
        })}
      </PlateChipGrid>
    </Screen>
  );
}
