import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import {
  RPE_STEPS,
  appendKey,
  formatWeight,
  loadFromRpe,
  parseKeypad,
  percentAt,
  rirFromRpe,
  rpeTable,
} from '../src/engine';
import { useAppStore } from '../src/store/useAppStore';
import { theme } from '../src/theme';

export default function RpeScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'oneRm' | 'reps' | 'rpe'>('oneRm');
  const [oneRmRaw, setOneRmRaw] = useState(unit === 'lb' ? '315' : '140');
  const [repsRaw, setRepsRaw] = useState('5');
  const [rpeRaw, setRpeRaw] = useState('8');
  const oneRm = parseKeypad(oneRmRaw);
  const reps = Math.max(1, Math.round(parseKeypad(repsRaw) || 1));
  const rpe = parseKeypad(rpeRaw) || 8;
  const percent = percentAt(reps, rpe);
  const load = loadFromRpe(oneRm, reps, rpe);
  const table = rpeTable();

  return (
    <Screen
      title="RPE / RIR"
      subtitle="Percent of 1RM"
      footer={
        <Keypad
          onKey={(key) => {
            if (field === 'oneRm') setOneRmRaw((c) => appendKey(c, key));
            if (field === 'reps') setRepsRaw((c) => appendKey(c, key, 2));
            if (field === 'rpe') setRpeRaw((c) => appendKey(c, key));
          }}
        />
      }
    >
      <Segmented
        value={field}
        options={[
          { value: 'oneRm', label: '1RM' },
          { value: 'reps', label: 'Reps' },
          { value: 'rpe', label: 'RPE' },
        ]}
        onChange={setField}
      />
      <Text style={styles.result}>
        {load != null ? formatWeight(load, unit, rounding) : 'Out of table'}
      </Text>
      <Text style={styles.meta}>
        {percent != null ? `${percent}% of 1RM` : 'Choose listed reps and RPE'} · RIR {rirFromRpe(rpe)}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.sticky]}>Reps</Text>
            {RPE_STEPS.map((step) => (
              <Text key={step} style={styles.th}>
                {step}
              </Text>
            ))}
          </View>
          {table.map((row) => (
            <View key={row.reps} style={styles.tr}>
              <Text style={[styles.td, styles.sticky]}>{row.reps}</Text>
              {row.values.map((value, index) => (
                <Text key={`${row.reps}-${index}`} style={styles.td}>
                  {value}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: { color: theme.accent, fontSize: 32, fontWeight: '800' },
  meta: { color: theme.muted, marginBottom: 8 },
  tr: { flexDirection: 'row' },
  th: { width: 46, color: theme.accent, fontWeight: '800', fontSize: 11, paddingVertical: 6 },
  td: { width: 46, color: theme.text, fontSize: 11, paddingVertical: 5 },
  sticky: { width: 40, color: theme.muted, fontWeight: '800' },
});
