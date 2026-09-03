import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { appendKey, estimateOneRm, formatWeight, parseKeypad } from '../src/engine';
import { useAppStore } from '../src/store/useAppStore';
import { theme } from '../src/theme';

export default function OneRmScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'weight' | 'reps'>('weight');
  const [weightRaw, setWeightRaw] = useState(unit === 'lb' ? '225' : '100');
  const [repsRaw, setRepsRaw] = useState('5');
  const result = estimateOneRm(parseKeypad(weightRaw), parseKeypad(repsRaw) || 1);

  return (
    <Screen
      title="One-Rep Max"
      subtitle="Brzycki and Epley"
      footer={
        <Keypad
          onKey={(key) => {
            if (field === 'weight') setWeightRaw((c) => appendKey(c, key));
            else setRepsRaw((c) => appendKey(c, key, 2));
          }}
          onClear={() => (field === 'weight' ? setWeightRaw('') : setRepsRaw(''))}
        />
      }
    >
      <Segmented
        value={field}
        options={[
          { value: 'weight', label: 'Weight' },
          { value: 'reps', label: 'Reps' },
        ]}
        onChange={setField}
      />
      <View style={styles.row}>
        <Stat label="Weight" value={formatWeight(result.weight, unit, rounding)} />
        <Stat label="Reps" value={String(result.reps)} />
      </View>
      <Stat label="Brzycki" value={formatWeight(result.brzycki, unit, rounding)} big />
      <Stat label="Epley" value={formatWeight(result.epley, unit, rounding)} big />
      <Stat label="e1RM average" value={formatWeight(result.average, unit, rounding)} accent />
    </Screen>
  );
}

function Stat({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, big && styles.big, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: { color: theme.muted, fontWeight: '700', fontSize: 12 },
  value: { color: theme.text, fontWeight: '800', fontSize: 22, marginTop: 4 },
  big: { fontSize: 26 },
  accent: { color: theme.accent },
});
