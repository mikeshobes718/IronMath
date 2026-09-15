import FontAwesome from '@expo/vector-icons/FontAwesome';
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
import { cardShadow, glowShadow, radius } from '../theme';
import { useThemeColors } from '../theme/ThemeRoot';
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
import { Glow } from './Glow';
import { Numpad } from './Numpad';
import { ProgressRing } from './ProgressRing';
import { useKeypad } from './useKeypad';

const PHASE_COPY: Record<RestPhase, string> = {
  idle: 'READY',
  running: 'RESTING',
  paused: 'PAUSED',
  done: 'TIME TO LIFT',
};

const RING_SIZE = 264;
const RING_STROKE = 14;

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
    <Numpad
      mode="overlay"
      visible={keypad.open}
      onDone={keypad.hide}
      onKey={(key) => void typeCustomRest(appendRestKey(raw, key))}
      onClear={() => void typeCustomRest('')}
    />
  );
}

export function RestTimerCard({ keypad }: Props) {
  const theme = useThemeColors();
  const { durationSec, remainingSec, phase } = useRestTimer();
  const usingCustom = useAppStore((state) => state.restUsingCustom);
  const customRaw = useAppStore((state) => state.restCustomRaw);
  const [startBlocked, setStartBlocked] = useState(false);
  const customValid = !usingCustom || applyCustomRest(customRaw) !== null;
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 18,
      paddingVertical: 22,
      gap: 18,
      marginBottom: 16,
      alignItems: 'center' as const,
      overflow: 'hidden' as const,
    },
    phasePill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: phase === 'done' ? `${t.success}22` : t.card,
    },
    phaseText: {
      color: phase === 'done' ? t.success : t.muted,
      fontSize: 12,
      fontWeight: '800' as const,
      letterSpacing: 1,
    },
    ringWrap: { alignItems: 'center' as const, justifyContent: 'center' as const },
    clock: {
      color: t.text,
      fontSize: 60,
      fontWeight: '800' as const,
      letterSpacing: -2,
      fontVariant: ['tabular-nums' as const],
    },
    clockDone: { color: t.success },
    of: { color: t.dim, fontSize: 13, fontWeight: '700' as const, marginTop: 2 },
    custom: {
      width: '100%' as const,
      backgroundColor: t.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: keypad.open ? t.accent : t.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
    },
    customKicker: {
      color: t.muted,
      fontSize: 12,
      fontWeight: '800' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    customValue: {
      color: t.text,
      fontSize: 34,
      fontWeight: '800' as const,
      letterSpacing: -1,
      fontVariant: ['tabular-nums' as const],
    },
    customHint: { color: t.dim, fontSize: 13, lineHeight: 18 },
    customHintBad: { color: t.danger, fontSize: 13, lineHeight: 18 },
    actions: { flexDirection: 'row' as const, gap: 12, width: '100%' as const, alignItems: 'center' as const },
    primary: {
      flex: 1,
      minHeight: 58,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.accent,
      paddingHorizontal: 14,
    },
    primaryLabel: { color: t.accentText, fontSize: 17, fontWeight: '800' as const },
    ghost: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: t.card,
    },
  }));

  const progress = durationSec > 0 ? 1 - remainingSec / durationSec : 0;
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
    <View style={[styles.card, cardShadow(theme.bg, 0.5)]}>
      {phase === 'running' || phase === 'done' ? (
        <Glow color={phase === 'done' ? theme.success : theme.accent} size={340} top={-90} opacity={0.28} />
      ) : null}
      <View style={styles.phasePill}>
        <Text style={styles.phaseText}>{PHASE_COPY[phase]}</Text>
      </View>

      <View style={styles.ringWrap}>
        <ProgressRing
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          progress={progress}
          trackColor={theme.card}
          fillColor={phase === 'done' ? theme.success : theme.accent}
        >
          <Text style={[styles.clock, phase === 'done' && styles.clockDone]}>{formatRestClock(remainingSec)}</Text>
          <Text style={styles.of}>of {formatRestClock(durationSec)}</Text>
        </ProgressRing>
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
          style={[styles.primary, glowShadow(theme.accent, phase === 'running' ? 0 : 0.35)]}
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
            <FontAwesome name="rotate-left" size={18} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
