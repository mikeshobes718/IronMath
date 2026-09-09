import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Keypad } from '../src/components/Keypad';
import { Screen } from '../src/components/Screen';
import { Segmented } from '../src/components/Segmented';
import { useKeypad } from '../src/components/useKeypad';
import {
  appendKey,
  clubOtherCopy,
  clubProgress,
  clubTotal,
  rawForUnitChange,
  formatWeight,
  parseKeypad,
  type Unit,
} from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore } from '../src/store/useAppStore';
import { space } from '../src/theme';
import { useThemedStyles } from '../src/theme/useThemedStyles';

type ClubField = 'squat' | 'bench' | 'deadlift';

export default function ClubScreen() {
  const rounding = useAppStore((state) => state.rounding);
  const club = useAppStore((state) => state.club);
  const setClubField = useAppStore((state) => state.setClubField);
  const setClubUnit = useAppStore((state) => state.setClubUnit);
  const [field, setField] = useState<ClubField>('squat');
  const keypad = useKeypad();
  const squat = parseKeypad(club.squat);
  const bench = parseKeypad(club.bench);
  const dead = parseKeypad(club.deadlift);
  const total = clubTotal(squat, bench, dead);
  const progress = clubProgress(total, club.unit);
  const styles = useThemedStyles((theme) => ({
    hero: { gap: 4, marginBottom: space.sm },
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
    total: {
      color: theme.accent,
      fontSize: 52,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
    copy: { color: theme.text, fontSize: 16, fontWeight: '600' },
    track: {
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.card,
      overflow: 'hidden' as const,
      marginTop: 8,
      marginBottom: space.md,
    },
    fill: {
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.accent,
    },
    row: { flexDirection: 'row', gap: 10 },
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
    fieldValue: { color: theme.text, fontWeight: '800', fontSize: 20, marginTop: 4 },
    meta: { color: theme.muted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  }));

  const switchUnit = (next: Unit) => {
    if (next === club.unit) {
      return;
    }
    (['squat', 'bench', 'deadlift'] as const).forEach((key) => {
      const value = parseKeypad(club[key]);
      if (value > 0) {
        setClubField(key, rawForUnitChange(value, club.unit, next));
      }
    });
    setClubUnit(next);
  };

  const pick = (next: ClubField) => {
    void tick('light');
    setField(next);
    keypad.show();
  };

  const gapCopy = progress.reached
    ? `You are in the ${progress.goal} ${club.unit === 'lb' ? 'LB' : 'KG'} club.`
    : `${formatWeight(progress.remaining, club.unit, rounding)} to go.`;

  return (
    <Screen
      embedded
      hint="Type your best squat, bench, and deadlift. We add them up and keep the numbers after you close the app."
      onDismiss={keypad.hide}
      footer={
        <Keypad
          open={keypad.open}
          onOpenChange={keypad.setOpen}
          onKey={(key) => setClubField(field, appendKey(club[field], key))}
          onClear={() => setClubField(field, '')}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <Text style={styles.kicker}>Total</Text>
          <View style={styles.unitSeg}>
            <Segmented
              value={club.unit}
              options={[
                { value: 'lb', label: 'LB' },
                { value: 'kg', label: 'KG' },
              ]}
              onChange={switchUnit}
            />
          </View>
        </View>
        <Text style={styles.total}>{formatWeight(total, club.unit, rounding)}</Text>
        <Text style={styles.copy}>{gapCopy}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.row}>
        {(['squat', 'bench', 'deadlift'] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${key}. Opens the keypad.`}
            onPress={() => pick(key)}
            style={[styles.field, field === key && styles.fieldOn]}
          >
            <Text style={styles.fieldLabel}>
              {key === 'squat' ? 'Squat' : key === 'bench' ? 'Bench' : 'Dead'}
            </Text>
            <Text style={styles.fieldValue}>{club[key] || '0'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.meta}>
        {clubOtherCopy(progress.otherTotal, progress.otherUnit, (value, unit) =>
          formatWeight(value, unit, rounding)
        )}
      </Text>
    </Screen>
  );
}
