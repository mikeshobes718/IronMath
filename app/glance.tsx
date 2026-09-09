import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BarbellSleeve } from '../src/components/BarbellSleeve';
import { OpenOnGlassesButton } from '../src/components/OpenOnGlassesButton';
import { RestDurationKeypad, RestTimerCard } from '../src/components/RestTimerCard';
import { Screen } from '../src/components/Screen';
import { useKeypad } from '../src/components/useKeypad';
import { bumpTargetRaw, GYM_STEP } from '../src/engine';
import { tick } from '../src/haptics/feedback';
import { useAppStore } from '../src/store/useAppStore';
import { useThemedStyles } from '../src/theme/useThemedStyles';
import { pinGymHud, stopGymHud } from '../src/wearables/gymHud';
import { openIronMathOnGlasses } from '../src/wearables/openOnGlasses';
import { useGlanceHud } from '../src/wearables/useGlanceHud';

export default function GlanceScreen() {
  useKeepAwake();
  const keypad = useKeypad();
  const router = useRouter();
  const params = useLocalSearchParams<{ glasses?: string }>();
  const hud = useGlanceHud();
  const pinned = useAppStore((state) => state.gymHudPinned);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const setLoadTargetRaw = useAppStore((state) => state.setLoadTargetRaw);
  const loadTargetRaw = useAppStore((state) => state.loadTargetRaw);
  const autoStarted = useRef(false);
  const styles = useThemedStyles((colors) => ({
    block: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
      marginBottom: 16,
    },
    kicker: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    huge: {
      color: colors.text,
      fontSize: 46,
      fontWeight: '800' as const,
      letterSpacing: -1.6,
    },
    loaded: {
      color: colors.accent,
      fontSize: 44,
      fontWeight: '800' as const,
      letterSpacing: -1.2,
    },
    side: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800' as const,
      lineHeight: 34,
    },
    other: { color: colors.muted, fontSize: 18, fontWeight: '700' as const },
    missExact: { color: colors.success, fontSize: 16, fontWeight: '800' as const },
    missMiss: { color: colors.danger, fontSize: 16, fontWeight: '800' as const },
    convertRow: { flexDirection: 'row' as const, gap: 12, marginTop: 4 },
    convertCol: { flex: 1, gap: 2 },
    bumpRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
    bump: {
      flex: 1,
      minHeight: 56,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bumpLabel: { color: colors.text, fontSize: 20, fontWeight: '800' as const },
    actionGhost: {
      minHeight: 54,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      paddingHorizontal: 14,
    },
    ghostLabel: { color: colors.text, fontSize: 17, fontWeight: '800' as const },
    note: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
    barCard: { marginBottom: 16 },
  }));

  useEffect(() => {
    if (autoStarted.current) {
      return;
    }
    if (params.glasses !== '1' && params.glasses !== 'true') {
      return;
    }
    autoStarted.current = true;
    void openIronMathOnGlasses('load');
  }, [params.glasses]);

  const bump = (delta: number) => {
    void tick('medium');
    setLoadTargetRaw(bumpTargetRaw(loadTargetRaw, delta));
  };

  return (
    <Screen
      embedded
      hint="Type the set on Load or Convert first. Open on glasses sends this snapshot to the Display. Pin it to the lock screen so you do not unlock every set."
      onDismiss={keypad.hide}
      footer={<RestDurationKeypad keypad={keypad} />}
    >
      <View style={styles.block}>
        <Text style={styles.kicker}>Load</Text>
        <Text style={styles.huge}>{hud.targetLabel}</Text>
        <Text style={styles.loaded}>{hud.loadedLabel}</Text>
        <Text style={styles.other}>{hud.otherLoadedLabel}</Text>
        <Text style={styles.side}>{hud.eachSide}</Text>
        <Text style={hud.exact ? styles.missExact : styles.missMiss}>{hud.miss}</Text>
      </View>

      <View style={styles.barCard}>
        <BarbellSleeve plates={hud.plates} plateTheme={plateTheme} compact />
      </View>

      <View style={styles.block}>
        <Text style={styles.kicker}>LB and KG</Text>
        <View style={styles.convertRow}>
          <View style={styles.convertCol}>
            <Text style={styles.huge}>{hud.convertLb.replace(' LB', '')}</Text>
            <Text style={styles.other}>LB</Text>
          </View>
          <View style={styles.convertCol}>
            <Text style={styles.huge}>{hud.convertKg.replace(' KG', '')}</Text>
            <Text style={styles.other}>KG</Text>
          </View>
        </View>
      </View>

      <View style={styles.bumpRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Minus ${GYM_STEP}`} onPress={() => bump(-GYM_STEP)} style={styles.bump}>
          <Text style={styles.bumpLabel}>- {GYM_STEP}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plus ${GYM_STEP}`} onPress={() => bump(GYM_STEP)} style={styles.bump}>
          <Text style={styles.bumpLabel}>+ {GYM_STEP}</Text>
        </Pressable>
      </View>

      <RestTimerCard keypad={keypad} />

      <Text style={styles.note}>Open on glasses sends this set to IronMath on the lens. If the display is blank, pick IronMath in Web Apps.</Text>

      <OpenOnGlassesButton view="load" filled />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pinned ? 'Keep gym glance on lock screen' : 'Pin gym glance to lock screen'}
        onPress={() => {
          void tick('medium');
          void pinGymHud(!pinned);
        }}
        style={styles.actionGhost}
      >
        <Text style={styles.ghostLabel}>{pinned ? 'Pinned to lock screen' : 'Pin to lock screen'}</Text>
      </Pressable>

      {pinned ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop lock screen glance"
          onPress={() => {
            void tick('light');
            void stopGymHud();
          }}
          style={styles.actionGhost}
        >
          <Text style={styles.ghostLabel}>Stop lock screen</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Type a new Load target"
        onPress={() => {
          void tick('light');
          router.navigate('/(tabs)');
        }}
        style={styles.actionGhost}
      >
        <Text style={styles.ghostLabel}>Type a new Load</Text>
      </Pressable>
    </Screen>
  );
}
