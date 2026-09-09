import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import { appendKey, estimateOneRm, formatWeight, parseKeypad } from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore, useUnitSeed } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function OneRmScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'weight' | 'reps'>('weight');
  const [weightRaw, setWeightRaw] = useUnitSeed('225', '100');
  const [repsRaw, setRepsRaw] = useState('5');
  const keypad = useKeypad();
  const result = estimateOneRm(parseKeypad(weightRaw), parseKeypad(repsRaw) || 1);
  const styles = useThemedStyles((theme) => ({
    hero: { gap: 4, marginBottom: 12 },
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
    row: { flexDirection: 'row', gap: 10, marginBottom: space.md },
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
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: -1.2,
    },
    meta: { color: theme.muted, fontSize: 14, fontWeight: '600' },
  }));

  return (
    <Screen
      embedded
      hint="Type a weight you lifted and how many reps. We estimate the most you could lift once."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => {
            if (field === 'weight') {
              setWeightRaw((current) => appendKey(current, key));
            } else {
              setRepsRaw((current) => appendKey(current, key, 2));
            }
          }}
          onClear={() => (field === 'weight' ? setWeightRaw('') : setRepsRaw(''))}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weight you lifted. Opens the keypad."
        onPress={() => {
          void tick('light');
          setField('weight');
          keypad.show();
        }}
        style={styles.hero}
      >
        <Text style={styles.kicker}>Weight you lifted</Text>
        <Text style={styles.input}>{weightRaw || '0'}</Text>
      </Pressable>
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
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Gym unit</Text>
          <Text style={styles.fieldValue}>{unit === 'kg' ? 'KG' : 'LB'}</Text>
        </View>
      </View>
      <Segmented
        value={field}
        options={[
          { value: 'weight', label: 'Weight' },
          { value: 'reps', label: 'Reps' },
        ]}
        onChange={(next) => {
          setField(next);
          keypad.show();
        }}
      />
      <View style={styles.answer}>
        <Text style={styles.answerKicker}>Estimated max</Text>
        <Text style={styles.answerValue}>{formatWeight(result.average, unit, rounding)}</Text>
        <Text style={styles.meta}>
          Brzycki {formatWeight(result.brzycki, unit, rounding)} · Epley {formatWeight(result.epley, unit, rounding)}
        </Text>
      </View>
    </Screen>
  );
}
