import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import {
  appendKey,
  formatWeight,
  parseKeypad,
  scoreLifts,
  type Equipment,
  type ScoreEvent,
  type Sex,
} from '../src/engine';
import { useAppStore } from '../src/store/useAppStore';
import { theme } from '../src/theme';

export default function DotsScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'bw' | 'total'>('bw');
  const [bwRaw, setBwRaw] = useState(unit === 'lb' ? '198' : '90');
  const [totalRaw, setTotalRaw] = useState(unit === 'lb' ? '1543' : '700');
  const [sex, setSex] = useState<Sex>('male');
  const [equipment, setEquipment] = useState<Equipment>('classic');
  const [event, setEvent] = useState<ScoreEvent>('powerlifting');
  const result = scoreLifts({
    bodyweight: parseKeypad(bwRaw),
    total: parseKeypad(totalRaw),
    unit,
    sex,
    equipment,
    event,
  });

  return (
    <Screen
      title="DOTS / IPF GL"
      subtitle="Official coefficients"
      footer={
        <Keypad
          onKey={(key) => {
            if (field === 'bw') setBwRaw((c) => appendKey(c, key));
            else setTotalRaw((c) => appendKey(c, key));
          }}
        />
      }
    >
      <Segmented
        value={field}
        options={[
          { value: 'bw', label: 'Bodyweight' },
          { value: 'total', label: 'Total' },
        ]}
        onChange={setField}
      />
      <Segmented
        value={sex}
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        onChange={setSex}
      />
      <Segmented
        value={equipment}
        options={[
          { value: 'classic', label: 'Raw' },
          { value: 'equipped', label: 'Equipped' },
        ]}
        onChange={setEquipment}
      />
      <Segmented
        value={event}
        options={[
          { value: 'powerlifting', label: 'SBD' },
          { value: 'bench', label: 'Bench' },
        ]}
        onChange={setEvent}
      />
      <View style={styles.card}>
        <Text style={styles.k}>Bodyweight</Text>
        <Text style={styles.v}>{formatWeight(parseKeypad(bwRaw), unit, rounding)}</Text>
        <Text style={styles.k}>Total</Text>
        <Text style={styles.v}>{formatWeight(parseKeypad(totalRaw), unit, rounding)}</Text>
        <Text style={styles.k}>DOTS</Text>
        <Text style={styles.accent}>{result.dots.toFixed(2)}</Text>
        <Text style={styles.k}>IPF GL</Text>
        <Text style={styles.accent}>{result.gl.toFixed(3)}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  k: { color: theme.muted, fontWeight: '700', marginTop: 8 },
  v: { color: theme.text, fontSize: 22, fontWeight: '800' },
  accent: { color: theme.accent, fontSize: 28, fontWeight: '800' },
});
