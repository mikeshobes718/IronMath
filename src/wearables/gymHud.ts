import { useEffect } from 'react';
import { InteractionManager, Platform } from 'react-native';
import {
  addHudActionListener,
  configureWearables,
  connectDisplay,
  getWearablesStatus,
  handleWearablesUrl,
  openGlassesAppUpdate,
  sendGlassesHud,
  startRegistration,
  wearablesAvailable,
  type GlassesHudPayload,
  type WearablesStatus,
} from 'ironmath-wearables';
import { barWeight, buildGlanceHud, bumpTargetRaw, collarWeight, type GlanceHud } from '../engine';
import { useAppStore } from '../store/useAppStore';
import { useGlanceHud } from './useGlanceHud';

export type { WearablesStatus };

type LiveActivityModule = typeof import('expo-live-activity');

let liveActivityId: string | undefined;
let glassesSessionActive = false;
let liveActivityModule: LiveActivityModule | null | undefined;

function getLiveActivity(): LiveActivityModule | null {
  if (liveActivityModule !== undefined) {
    return liveActivityModule;
  }
  if (Platform.OS !== 'ios') {
    liveActivityModule = null;
    return null;
  }
  try {
    liveActivityModule = require('expo-live-activity') as LiveActivityModule;
  } catch {
    liveActivityModule = null;
  }
  return liveActivityModule;
}

function payloadFromHud(hud: GlanceHud): GlassesHudPayload {
  return {
    targetLabel: hud.targetLabel,
    loadedLabel: hud.loadedLabel,
    otherLoadedLabel: hud.otherLoadedLabel,
    eachSide: hud.eachSide,
    miss: hud.miss,
    convertLb: hud.convertLb,
    convertKg: hud.convertKg,
    bumpStep: hud.bumpStep,
  };
}

function liveState(hud: GlanceHud) {
  return {
    title: hud.lockTitle,
    subtitle: hud.lockSubtitle,
    progressBar: {
      progress: hud.exact ? 1 : 0.55,
    },
  };
}

const liveConfig = {
  backgroundColor: '#09090B',
  titleColor: '#FAFAFA',
  subtitleColor: '#A1A1AA',
  progressViewTint: '#D4A373',
  progressViewLabelColor: '#FAFAFA',
  deepLinkUrl: '/glance',
};

export { wearablesAvailable };

export async function refreshWearablesStatus(): Promise<WearablesStatus> {
  return getWearablesStatus();
}

export async function pinGymHud(on: boolean) {
  useAppStore.getState().setGymHudPinned(on);
  if (!on) {
    await stopLockScreen();
    return;
  }
  const hud = currentHud();
  await startLockScreen(hud);
}

export async function startGlassesSession(): Promise<string> {
  useAppStore.getState().setGymHudPinned(true);
  const hud = currentHud();
  await startLockScreen(hud);
  if (!wearablesAvailable()) {
    return 'Lock screen is on. Meta Wearables SDK is not in this binary.';
  }
  try {
    await configureWearables();
    const status = await getWearablesStatus();
    if (!String(status.registration).toLowerCase().includes('registered')) {
      await startRegistration();
    }
    const connected = await connectDisplay();
    glassesSessionActive = true;
    const sent = await sendGlassesHud(payloadFromHud(hud));
    if (connected === 'started' || sent === 'sent') {
      return 'Glasses HUD is live. Look at the lens for Load and Convert.';
    }
    return `Glasses ${connected}.`;
  } catch (error) {
    glassesSessionActive = false;
    const message = error instanceof Error ? error.message : 'Glasses did not connect.';
    if (needsDatInstall(message)) {
      try {
        await openGlassesAppUpdate();
      } catch {
        // Meta AI may already be showing the DAT install page.
      }
      return `Lock screen is on. ${message}`;
    }
    return `Lock screen is on. ${message}`;
  }
}

export async function installDatOnGlasses(): Promise<string> {
  if (!wearablesAvailable()) {
    return 'Meta Wearables SDK is not in this binary.';
  }
  try {
    await configureWearables();
    await openGlassesAppUpdate();
    return 'Meta AI should open to install DAT on the glasses. Keep them on.';
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not open DAT install.';
  }
}

function needsDatInstall(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('update') ||
    lower.includes('dwa') ||
    lower.includes('eligible') ||
    lower.includes('developer mode') ||
    lower.includes('not reachable') ||
    lower.includes('app connections')
  );
}

export async function stopGymHud() {
  glassesSessionActive = false;
  useAppStore.getState().setGymHudPinned(false);
  await stopLockScreen();
}

async function startLockScreen(hud: GlanceHud) {
  const LiveActivity = getLiveActivity();
  if (!LiveActivity) {
    return;
  }
  try {
    if (!liveActivityId) {
      const id = LiveActivity.startActivity(liveState(hud), liveConfig);
      liveActivityId = typeof id === 'string' ? id : undefined;
    } else {
      LiveActivity.updateActivity(liveActivityId, liveState(hud));
    }
  } catch {
    try {
      const id = LiveActivity.startActivity(liveState(hud), liveConfig);
      liveActivityId = typeof id === 'string' ? id : undefined;
    } catch {
      liveActivityId = undefined;
    }
  }
}

async function stopLockScreen() {
  const LiveActivity = getLiveActivity();
  if (!LiveActivity || !liveActivityId) {
    liveActivityId = undefined;
    return;
  }
  try {
    LiveActivity.stopActivity(liveActivityId, liveState(currentHud()));
  } catch {
    // Activity already gone.
  }
  liveActivityId = undefined;
}

function currentHud(): GlanceHud {
  const state = useAppStore.getState();
  const gym = state.gyms.find((item) => item.id === state.activeGymId) ?? state.gyms[0];
  const inventory = state.unit === 'lb' ? gym.inventoryLb : gym.inventoryKg;
  return buildGlanceHud({
    targetRaw: state.loadTargetRaw,
    inputUnit: state.loadInputUnit,
    gymUnit: state.unit,
    bar: barWeight(state.barId, state.unit, state.customBar),
    collars: collarWeight(state.collarId, state.unit),
    inventory,
    rounding: state.rounding,
    convertRaw: state.convertRaw,
    convertFrom: state.convertFrom,
  });
}

export async function handleIncomingWearablesUrl(url: string) {
  try {
    await handleWearablesUrl(url);
  } catch {
    // DAT URL handling is optional. Load still works.
  }
}

export function GymHudSync() {
  const hud = useGlanceHud();
  const pinned = useAppStore((state) => state.gymHudPinned);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        sub = addHudActionListener((action) => {
          if (action.type !== 'bump') {
            return;
          }
          const delta = typeof action.delta === 'number' ? action.delta : 0;
          const current = useAppStore.getState().loadTargetRaw;
          useAppStore.getState().setLoadTargetRaw(bumpTargetRaw(current, delta));
        });
      } catch {
        sub = undefined;
      }
    });
    return () => {
      task.cancel();
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!pinned) {
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void startLockScreen(hud);
      if (glassesSessionActive && wearablesAvailable()) {
        void sendGlassesHud(payloadFromHud(hud)).catch(() => undefined);
      }
    });
    return () => task.cancel();
  }, [hud, pinned]);

  return null;
}
