import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { OpenOnGlassesButton } from '../src/components/OpenOnGlassesButton';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import { appendKey, convertWeight, formatWeight, parseKeypad, rawForUnitChange, type Unit } from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function ConvertScreen() {
  const rounding = useAppStore((state) => state.rounding);
  const from = useAppStore((state) => state.convertFrom);
  const raw = useAppStore((state) => state.convertRaw);
  const setFrom = useAppStore((state) => state.setConvertFrom);
  const setRaw = useAppStore((state) => state.setConvertRaw);
  const keypad = useKeypad();
  const value = parseKeypad(raw);
  const other: Unit = from === 'lb' ? 'kg' : 'lb';
  const converted = useMemo(() => convertWeight(value, from, other), [value, from, other]);
  const styles = useThemedStyles((theme) => ({
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
    input: {
      color: theme.text,
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
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
  }));

  const switchUnit = (next: Unit) => {
    if (next === from) {
      return;
    }
    if (value > 0) {
      setRaw(rawForUnitChange(value, from, next));
    }
    setFrom(next);
  };

  return (
    <Screen
      embedded
      hint="Type a weight. We show the other unit. Tap the number to type. Open on glasses sends this Convert to the Display."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => setRaw(appendKey(raw, key))}
          onClear={() => setRaw('')}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weight to convert. Opens the keypad."
        onPress={() => {
          void tick('light');
          keypad.show();
        }}
        style={styles.hero}
      >
        <View style={styles.heroHead}>
          <Text style={styles.kicker}>From</Text>
          <View style={styles.unitSeg}>
            <Segmented
              value={from}
              options={[
                { value: 'lb', label: 'LB' },
                { value: 'kg', label: 'KG' },
              ]}
              onChange={switchUnit}
            />
          </View>
        </View>
        <Text style={styles.input}>{raw || '0'}</Text>
      </Pressable>
      <View style={styles.answer}>
        <Text style={styles.answerKicker}>{other === 'kg' ? 'In kilos' : 'In pounds'}</Text>
        <Text style={styles.answerValue}>{formatWeight(converted, other, rounding)}</Text>
      </View>
      <OpenOnGlassesButton view="convert" onOpen={keypad.hide} />
    </Screen>
  );
}
