import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import { appendKey, formatWeight, loadFromRpe, parseKeypad, percentAt, rirFromRpe } from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore, useUnitSeed } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function RpeScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'oneRm' | 'reps' | 'rpe'>('oneRm');
  const [oneRmRaw, setOneRmRaw] = useUnitSeed('315', '140');
  const [repsRaw, setRepsRaw] = useState('5');
  const [rpeRaw, setRpeRaw] = useState('8');
  const keypad = useKeypad();
  const oneRm = parseKeypad(oneRmRaw);
  const reps = Math.max(1, Math.round(parseKeypad(repsRaw) || 1));
  const rpe = parseKeypad(rpeRaw) || 8;
  const percent = percentAt(reps, rpe);
  const load = loadFromRpe(oneRm, reps, rpe);
  const left = rirFromRpe(rpe);
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
    fields: { flexDirection: 'row', gap: 8, marginBottom: space.md },
    field: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    fieldOn: { borderColor: theme.accent },
    fieldLabel: { color: theme.muted, fontWeight: '700', fontSize: 12 },
    fieldValue: { color: theme.text, fontWeight: '800', fontSize: 18, marginTop: 4 },
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
    meta: { color: theme.muted, fontSize: 15, fontWeight: '600' },
  }));

  return (
    <Screen
      embedded
      hint="Type your max. Pick reps and how hard the set should feel (10 is nothing left). We suggest the load."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => {
            if (field === 'oneRm') {
              setOneRmRaw((current) => appendKey(current, key));
            }
            if (field === 'reps') {
              setRepsRaw((current) => appendKey(current, key, 2));
            }
            if (field === 'rpe') {
              setRpeRaw((current) => appendKey(current, key));
            }
          }}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Your max. Opens the keypad."
        onPress={() => {
          void tick('light');
          setField('oneRm');
          keypad.show();
        }}
        style={styles.hero}
      >
        <Text style={styles.kicker}>Your max</Text>
        <Text style={styles.input}>{oneRmRaw || '0'}</Text>
      </Pressable>
      <View style={styles.fields}>
        <Pressable
          onPress={() => {
            void tick('light');
            setField('reps');
            keypad.show();
          }}
          style={[styles.field, field === 'reps' && styles.fieldOn]}
        >
          <Text style={styles.fieldLabel}>Reps</Text>
          <Text style={styles.fieldValue}>{String(reps)}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void tick('light');
            setField('rpe');
            keypad.show();
          }}
          style={[styles.field, field === 'rpe' && styles.fieldOn]}
        >
          <Text style={styles.fieldLabel}>How hard (RPE)</Text>
          <Text style={styles.fieldValue}>{String(rpe)}</Text>
        </Pressable>
      </View>
      <Segmented
        value={field}
        options={[
          { value: 'oneRm', label: 'Max' },
          { value: 'reps', label: 'Reps' },
          { value: 'rpe', label: 'RPE' },
        ]}
        onChange={(next) => {
          setField(next);
          keypad.show();
        }}
      />
      <View style={styles.answer}>
        <Text style={styles.answerKicker}>Load this</Text>
        <Text style={styles.answerValue}>
          {load != null ? formatWeight(load, unit, rounding) : 'Pick listed reps and RPE'}
        </Text>
        <Text style={styles.meta}>
          {percent != null ? `${percent}% of your max` : 'Use 1 to 12 reps and RPE 6 to 10'}. About {left}{' '}
          {left === 1 ? 'rep' : 'reps'} left in the tank.
        </Text>
      </View>
    </Screen>
  );
}
