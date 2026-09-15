import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  formatWeight,
  LIFT_LIST,
  makeSetEntry,
  personalRecords,
  prCopy,
  type LiftId,
  type PrKind,
  type SetEntry,
  type Unit,
} from '../engine';
import { tick } from '../haptics/feedback';
import { useAppStore } from '../store/useAppStore';
import { useThemedStyles } from '../theme/useThemedStyles';
import { startRestTimer } from '../wearables/restTimer';
import { BottomSheet } from './BottomSheet';

const RPE_CHOICES: Array<number | null> = [null, 6, 7, 8, 9, 10];

type Props = {
  visible: boolean;
  weight: number;
  unit: Unit;
  /** Preselect a lift, for screens that already know which one this is. */
  liftId?: LiftId;
  onClose: () => void;
  onLogged?: (entry: SetEntry, records: PrKind[]) => void;
};

/**
 * Log the set you just did without leaving the bar: pick the lift, tap the
 * reps, done. Rest starts on its own unless that has been turned off.
 */
export function LogSetSheet({ visible, weight, unit, liftId: fixedLift, onClose, onLogged }: Props) {
  const rounding = useAppStore((state) => state.rounding);
  const log = useAppStore((state) => state.log);
  const logSet = useAppStore((state) => state.logSet);
  const autoRest = useAppStore((state) => state.autoRestOnLog);
  const lastLift = useAppStore((state) => state.lastLoggedLift);
  const lastReps = useAppStore((state) => state.lastLoggedReps);
  const setLastReps = useAppStore((state) => state.setLastLoggedReps);

  const [liftId, setLiftId] = useState<LiftId>(fixedLift ?? lastLift);
  const [reps, setReps] = useState(() => Math.max(1, Number(lastReps) || 5));
  const [rpe, setRpe] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setLiftId(fixedLift ?? lastLift);
      setReps(Math.max(1, Number(lastReps) || 5));
      setRpe(null);
    }
  }, [visible, fixedLift, lastLift, lastReps]);

  const styles = useThemedStyles((theme) => ({
    weight: {
      color: theme.accent,
      fontSize: 40,
      fontWeight: '800' as const,
      letterSpacing: -1.2,
    },
    kicker: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    },
    lifts: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    lift: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 44,
      justifyContent: 'center' as const,
    },
    liftOn: { backgroundColor: theme.accent, borderColor: theme.accent },
    liftLabel: { color: theme.muted, fontSize: 15, fontWeight: '700' as const },
    liftLabelOn: { color: theme.accentText },
    stepper: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    step: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    stepOff: { opacity: 0.35 },
    stepText: { color: theme.text, fontSize: 26, fontWeight: '700' as const },
    repsValue: {
      color: theme.text,
      fontSize: 34,
      fontWeight: '800' as const,
      fontVariant: ['tabular-nums' as const],
    },
    rpeRow: { flexDirection: 'row' as const, gap: 6 },
    rpe: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rpeOn: { backgroundColor: theme.accent, borderColor: theme.accent },
    rpeLabel: { color: theme.muted, fontSize: 15, fontWeight: '700' as const },
    rpeLabelOn: { color: theme.accentText },
    primary: {
      minHeight: 56,
      borderRadius: 999,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.accent,
      marginTop: 4,
    },
    primaryOff: { opacity: 0.4 },
    primaryLabel: { color: theme.accentText, fontSize: 17, fontWeight: '800' as const },
    note: { color: theme.dim, fontSize: 13, lineHeight: 18, textAlign: 'center' as const },
  }));

  const canLog = weight > 0;
  const previewRecords = useMemo(
    () => personalRecords(log, makeSetEntry({ liftId, weight, unit, reps, rpe, id: 'preview' })),
    [log, liftId, weight, unit, reps, rpe]
  );

  const stepReps = (delta: number) => {
    void tick('light');
    setReps((current) => Math.max(1, Math.min(100, current + delta)));
  };

  const commit = () => {
    if (!canLog) {
      void tick('warn');
      return;
    }
    const entry = makeSetEntry({ liftId, weight, unit, reps, rpe });
    const records = personalRecords(log, entry);
    logSet(entry);
    setLastReps(String(reps));
    void tick(records.length > 0 ? 'warn' : 'medium');
    onLogged?.(entry, records);
    onClose();
    if (autoRest) {
      void startRestTimer();
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Log this set"
      subtitle={prCopy(previewRecords) ?? undefined}
      onClose={onClose}
    >
      <Text style={styles.weight}>{formatWeight(weight, unit, rounding)}</Text>

      <View>
        <Text style={styles.kicker}>Lift</Text>
        <View style={styles.lifts}>
          {LIFT_LIST.map((lift) => {
            const active = lift.id === liftId;
            return (
              <Pressable
                key={lift.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={lift.title}
                onPress={() => {
                  void tick('light');
                  setLiftId(lift.id);
                }}
                style={[styles.lift, active && styles.liftOn]}
              >
                <Text style={[styles.liftLabel, active && styles.liftLabelOn]}>{lift.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={styles.kicker}>Reps</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One rep fewer"
            disabled={reps <= 1}
            onPress={() => stepReps(-1)}
            style={[styles.step, reps <= 1 && styles.stepOff]}
          >
            <Text style={styles.stepText}>-</Text>
          </Pressable>
          <Text style={styles.repsValue} accessibilityLabel={`${reps} reps`}>
            {reps}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One rep more"
            disabled={reps >= 100}
            onPress={() => stepReps(1)}
            style={[styles.step, reps >= 100 && styles.stepOff]}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View>
        <Text style={styles.kicker}>How hard (optional)</Text>
        <View style={styles.rpeRow}>
          {RPE_CHOICES.map((choice) => {
            const active = choice === rpe;
            const label = choice === null ? 'Skip' : String(choice);
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={choice === null ? 'No RPE' : `RPE ${choice}`}
                onPress={() => {
                  void tick('light');
                  setRpe(choice);
                }}
                style={[styles.rpe, active && styles.rpeOn]}
              >
                <Text style={[styles.rpeLabel, active && styles.rpeLabelOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log this set"
        disabled={!canLog}
        onPress={commit}
        style={[styles.primary, !canLog && styles.primaryOff]}
      >
        <Text style={styles.primaryLabel}>Log set</Text>
      </Pressable>
      <Text style={styles.note}>
        {canLog
          ? autoRest
            ? 'Rest starts on its own. Turn that off in Settings.'
            : 'Saved to the Log tab.'
          : 'Type a weight first.'}
      </Text>
    </BottomSheet>
  );
}
