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
  rawForUnitChange,
  remainingTo,
  type Unit,
} from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function RemainingScreen() {
  const rounding = useAppStore((state) => state.rounding);
  const haveRaw = useAppStore((state) => state.remainHave);
  const wantRaw = useAppStore((state) => state.remainWant);
  const unit = useAppStore((state) => state.remainUnit);
  const setRemainHave = useAppStore((state) => state.setRemainHave);
  const setRemainWant = useAppStore((state) => state.setRemainWant);
  const setRemainUnit = useAppStore((state) => state.setRemainUnit);
  const [field, setField] = useState<'have' | 'want'>('have');
  const keypad = useKeypad();
  const have = parseKeypad(haveRaw);
  const want = parseKeypad(wantRaw);
  const gap = remainingTo(have, want);
  const styles = useThemedStyles((theme) => ({
    hero: { gap: 4, marginBottom: space.md },
    kicker: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    answer: {
      color: theme.accent,
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
    copy: { color: theme.text, fontSize: 16, fontWeight: '600' },
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
    unitWrap: { width: 128, alignSelf: 'flex-end' as const },
  }));

  const switchUnit = (next: Unit) => {
    if (next === unit) {
      return;
    }
    if (have > 0) {
      setRemainHave(rawForUnitChange(have, unit, next));
    }
    if (want > 0) {
      setRemainWant(rawForUnitChange(want, unit, next));
    }
    setRemainUnit(next);
  };

  const pick = (next: 'have' | 'want') => {
    void tick('light');
    setField(next);
    keypad.show();
  };

  const copy =
    gap > 0
      ? `${formatWeight(gap, unit, rounding)} more to go.`
      : gap === 0
        ? 'You are there.'
        : `${formatWeight(Math.abs(gap), unit, rounding)} over the target.`;

  return (
    <Screen
      embedded
      hint="Type what you have and what you want. We keep both after you close the app."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => {
            if (field === 'have') {
              setRemainHave(appendKey(haveRaw, key));
            } else {
              setRemainWant(appendKey(wantRaw, key));
            }
          }}
          onClear={() => (field === 'have' ? setRemainHave('') : setRemainWant(''))}
        />
      }
    >
      <View style={styles.unitWrap}>
        <Segmented
          value={unit}
          options={[
            { value: 'lb', label: 'LB' },
            { value: 'kg', label: 'KG' },
          ]}
          onChange={switchUnit}
        />
      </View>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Gap</Text>
        <Text style={styles.answer}>{formatWeight(Math.abs(gap), unit, rounding)}</Text>
        <Text style={styles.copy}>{copy}</Text>
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="What you have. Opens the keypad."
          onPress={() => pick('have')}
          style={[styles.field, field === 'have' && styles.fieldOn]}
        >
          <Text style={styles.fieldLabel}>Have</Text>
          <Text style={styles.fieldValue}>{haveRaw || '0'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="What you want. Opens the keypad."
          onPress={() => pick('want')}
          style={[styles.field, field === 'want' && styles.fieldOn]}
        >
          <Text style={styles.fieldLabel}>Want</Text>
          <Text style={styles.fieldValue}>{wantRaw || '0'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
