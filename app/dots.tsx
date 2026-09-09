import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import {
  appendKey,
  formatWeight,
  parseKeypad,
  scoreLifts,
  type Equipment,
  type ScoreEvent,
  type Sex,
} from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore, useUnitSeed } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function DotsScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const [field, setField] = useState<'bw' | 'total'>('bw');
  const [bwRaw, setBwRaw] = useUnitSeed('198', '90');
  const [totalRaw, setTotalRaw] = useUnitSeed('1543', '700');
  const [sex, setSex] = useState<Sex>('male');
  const [equipment, setEquipment] = useState<Equipment>('classic');
  const [event, setEvent] = useState<ScoreEvent>('powerlifting');
  const keypad = useKeypad();
  const result = scoreLifts({
    bodyweight: parseKeypad(bwRaw),
    total: parseKeypad(totalRaw),
    unit,
    sex,
    equipment,
    event,
  });
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
    field: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: space.md,
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
      marginTop: 4,
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
      hint="Type bodyweight and your meet total. We score it so lighter and heavier lifters can compare."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => {
            if (field === 'bw') {
              setBwRaw((current) => appendKey(current, key));
            } else {
              setTotalRaw((current) => appendKey(current, key));
            }
          }}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bodyweight. Opens the keypad."
        onPress={() => {
          void tick('light');
          setField('bw');
          keypad.show();
        }}
        style={styles.hero}
      >
        <Text style={styles.kicker}>Bodyweight</Text>
        <Text style={styles.input}>{bwRaw || '0'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Meet total. Opens the keypad."
        onPress={() => {
          void tick('light');
          setField('total');
          keypad.show();
        }}
        style={[styles.field, field === 'total' && styles.fieldOn]}
      >
        <Text style={styles.fieldLabel}>Meet total</Text>
        <Text style={styles.fieldValue}>{formatWeight(parseKeypad(totalRaw), unit, rounding)}</Text>
      </Pressable>
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
      <View style={styles.answer}>
        <Text style={styles.answerKicker}>DOTS</Text>
        <Text style={styles.answerValue}>{result.dots.toFixed(1)}</Text>
        <Text style={styles.meta}>IPF GL {result.gl.toFixed(2)}</Text>
      </View>
    </Screen>
  );
}
