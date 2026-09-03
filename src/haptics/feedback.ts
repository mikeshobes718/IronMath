import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export type TickKind = 'light' | 'medium' | 'warn';

function webClick() {
  try {
    const Ctor =
      (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.045;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.028);
  } catch {
    // Optional.
  }
}

export async function tick(kind: TickKind = 'light') {
  const { hapticsEnabled, audioEnabled } = useAppStore.getState();

  if (hapticsEnabled && Platform.OS !== 'web') {
    if (kind === 'warn') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (kind === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.selectionAsync();
    }
  }

  if (audioEnabled) {
    if (Platform.OS === 'web') {
      webClick();
    } else if (hapticsEnabled && kind === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
}
