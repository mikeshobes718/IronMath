import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  appendRestKey,
  applyCustomRest,
  formatRestClock,
  isRestPreset,
  REST_CUSTOM_ID,
  REST_PRESETS,
  type RestPhase,
} from '../engine';
import { tick } from '../haptics/feedback';
import { useAppStore } from '../store/useAppStore';
import { useThemedStyles } from '../theme/useThemedStyles';
import {
  beginCustomRestDuration,
  changeRestDuration,
  pauseRestTimer,
  resetRestTimer,
  startRestTimer,
  typeCustomRest,
  useRestTimer,
} from '../wearables/restTimer';
import { ChipRow } from './Chips';
import { Keypad } from './Keypad';
import { useKeypad } from './useKeypad';

const PHASE_COPY: Record<RestPhase, string> = {
  idle: 'Ready',
  running: 'Resting',
  paused: 'Paused',
  done: 'Time to lift',
};

export type RestKeypad = ReturnType<typeof useKeypad>;

type Props = {
  keypad: RestKeypad;
};

export function RestDurationKeypad({ keypad }: { keypad: RestKeypad }) {
  const usingCustom = useAppStore((state) => state.restUsingCustom);
  const raw = useAppStore((state) => state.restCustomRaw);
  if (!usingCustom) {
    return null;
  }
  return (
    <Keypad
      open={keypad.open}
      onOpenChange={keypad.setOpen}
      onKey={(key) => void typeCustomRest(appendRestKey(raw, key))}
      onClear={() => void typeCustomRest('')}
    />
  );
}

export function RestTimerCard({ keypad }: Props) {
  const { durationSec, remainingSec, phase } = useRestTimer();
  const usingCustom = useAppStore((state) => state.restUsingCustom);
  const customRaw = useAppStore((state) => state.restCustomRaw);
  const [startBlocked, setStartBlocked] = useState(false);
  const customValid = !usingCustom || applyCustomRest(customRaw) !== null;
  const styles = useThemedStyles((theme) => ({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      marginBottom: 16,
    },
    headRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      justifyContent: 'space-between' as const,
    },
    kicker: {
      color: phase === 'done' ? theme.success : theme.muted,
      fontSize: 13,
      fontWeight: '800' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    of: { color: theme.dim, fontSize: 13, fontWeight: '700' as const },
    clock: {
      color: theme.text,
      fontSize: 72,
      fontWeight: '800' as const,
      letterSpacing: -2.4,
      lineHeight: 76,
      fontVariant: ['tabular-nums' as const],
      textAlign: 'center' as const,
    },
    clockLive: { color: theme.accent },
    clockDone: { color: theme.success },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.card,
      overflow: 'hidden' as const,
    },
    fill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: phase === 'done' ? theme.success : theme.accent,
    },
    custom: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: keypad.open ? theme.accent : theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    customKicker: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    customValue: {
      color: theme.text,
      fontSize: 36,
      fontWeight: '800' as const,
      letterSpacing: -1.2,
      fontVariant: ['tabular-nums' as const],
    },
    customHint: { color: theme.dim, fontSize: 13, lineHeight: 18 },
    customHintBad: { color: theme.danger, fontSize: 13, lineHeight: 18 },
    actions: { flexDirection: 'row' as const, gap: 10 },
    primary: {
      flex: 1,
      minHeight: 54,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.accent,
      paddingHorizontal: 14,
    },
    primaryLabel: { color: theme.accentText, fontSize: 17, fontWeight: '800' as const },
    ghost: {
      minHeight: 54,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 18,
    },
    ghostLabel: { color: theme.text, fontSize: 17, fontWeight: '800' as const },
  }));

  const progress = durationSec > 0 ? Math.min(100, Math.max(0, (1 - remainingSec / durationSec) * 100)) : 0;
  const primaryLabel =
    phase === 'running' ? 'Pause' : phase === 'paused' ? 'Resume' : phase === 'done' ? 'Go again' : 'Start';

  const onPrimary = () => {
    if (phase === 'running') {
      void tick('light');
      void pauseRestTimer();
      return;
    }
    void (async () => {
      const started = await startRestTimer();
      if (!started) {
        setStartBlocked(true);
        keypad.show();
        return;
      }
      setStartBlocked(false);
      keypad.hide();
    })();
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.kicker}>{PHASE_COPY[phase]}</Text>
        <Text style={styles.of}>of {formatRestClock(durationSec)}</Text>
      </View>
      <Text style={[styles.clock, phase === 'running' && styles.clockLive, phase === 'done' && styles.clockDone]}>
        {formatRestClock(remainingSec)}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <ChipRow
        items={[
          ...REST_PRESETS.map((sec) => ({ id: String(sec), label: formatRestClock(sec) })),
          { id: REST_CUSTOM_ID, label: 'Custom' },
        ]}
        selected={usingCustom || !isRestPreset(durationSec) ? REST_CUSTOM_ID : String(durationSec)}
        onSelect={(id) => {
          setStartBlocked(false);
          if (id === REST_CUSTOM_ID) {
            void beginCustomRestDuration();
            keypad.show();
            return;
          }
          keypad.hide();
          void changeRestDuration(Number(id));
        }}
      />
      {usingCustom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Custom rest time. Opens the keypad."
          onPress={() => {
            void tick('light');
            keypad.show();
          }}
          style={styles.custom}
        >
          <Text style={styles.customKicker}>Minutes and seconds</Text>
          <Text style={styles.customValue}>{customRaw || 'm:ss'}</Text>
          <Text style={startBlocked && !customValid ? styles.customHintBad : styles.customHint}>
            {startBlocked && !customValid
              ? 'Type a time from 5 seconds to 30 minutes. Then Start.'
              : 'Dot types a colon. Try 2:15, 45, or 4:00.'}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${primaryLabel} rest timer`}
          onPress={onPrimary}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
        {phase !== 'idle' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset rest timer"
            onPress={() => {
              void tick('light');
              void resetRestTimer();
            }}
            style={styles.ghost}
          >
            <Text style={styles.ghostLabel}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
