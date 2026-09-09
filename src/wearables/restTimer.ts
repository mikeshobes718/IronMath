import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  applyCustomRest,
  formatRestClock,
  remainingFromEnd,
  restIsPaused,
  restPhase,
  type RestPhase,
} from '../engine';
import { tick } from '../haptics/feedback';
import { useAppStore } from '../store/useAppStore';
import { pushRestTimerToGlasses } from './openOnGlasses';

type LiveActivityModule = typeof import('expo-live-activity');

let restActivityId: string | undefined;
let liveActivityModule: LiveActivityModule | null | undefined;
let doneHandledFor: number | null = null;

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

const restLiveConfig = {
  backgroundColor: '#09090B',
  titleColor: '#FAFAFA',
  subtitleColor: '#A1A1AA',
  progressViewTint: '#D4A373',
  progressViewLabelColor: '#FAFAFA',
  deepLinkUrl: '/rest',
  timerType: 'digital',
} as const;

function pushGlassesSoon() {
  void pushRestTimerToGlasses().catch(() => undefined);
}

async function syncRestLiveActivity() {
  const LiveActivity = getLiveActivity();
  if (!LiveActivity) {
    return;
  }
  const { restEndTs, restDurationSec } = useAppStore.getState();
  if (!restEndTs) {
    return;
  }
  const state = {
    title: 'Rest',
    subtitle: `${formatRestClock(restDurationSec)} rest. Tap to open IronMath.`,
    progressBar: { date: restEndTs },
  };
  try {
    if (!restActivityId) {
      const id = LiveActivity.startActivity(state, restLiveConfig);
      restActivityId = typeof id === 'string' ? id : undefined;
    } else {
      LiveActivity.updateActivity(restActivityId, state);
    }
  } catch {
    try {
      const id = LiveActivity.startActivity(state, restLiveConfig);
      restActivityId = typeof id === 'string' ? id : undefined;
    } catch {
      restActivityId = undefined;
    }
  }
}

async function stopRestLiveActivity() {
  const LiveActivity = getLiveActivity();
  if (!LiveActivity || !restActivityId) {
    restActivityId = undefined;
    return;
  }
  try {
    LiveActivity.stopActivity(restActivityId, { title: 'Rest', subtitle: 'Timer stopped.' });
  } catch {
    // Activity already gone.
  }
  restActivityId = undefined;
}

async function finishRestLiveActivity() {
  const LiveActivity = getLiveActivity();
  if (!LiveActivity || !restActivityId) {
    return;
  }
  const id = restActivityId;
  try {
    LiveActivity.updateActivity(id, { title: 'Rest over', subtitle: 'Time to lift.' });
  } catch {
    // Activity already gone.
  }
  setTimeout(() => {
    if (restActivityId !== id) {
      return;
    }
    try {
      LiveActivity.stopActivity(id, { title: 'Rest over', subtitle: 'Time to lift.' });
    } catch {
      // Activity already gone.
    }
    restActivityId = undefined;
  }, 12000);
}

export async function startRestTimer(): Promise<boolean> {
  const state = useAppStore.getState();
  const remaining = state.restRunning && state.restEndTs
    ? remainingFromEnd(state.restEndTs, Date.now())
    : Math.max(0, Math.round(state.restRemainingSec));
  const paused = restIsPaused(state.restRunning, remaining, state.restDurationSec);
  if (state.restUsingCustom && !paused) {
    const applied = applyCustomRest(state.restCustomRaw);
    if (applied === null) {
      void tick('warn');
      return false;
    }
    if (applied !== state.restDurationSec || remaining !== applied) {
      state.setRestDuration(applied);
      useAppStore.setState({ restUsingCustom: true });
    }
  }
  useAppStore.getState().startRest();
  void tick('medium');
  await syncRestLiveActivity();
  pushGlassesSoon();
  return true;
}

export async function pauseRestTimer() {
  useAppStore.getState().pauseRest();
  await stopRestLiveActivity();
  pushGlassesSoon();
}

export async function resetRestTimer() {
  useAppStore.getState().resetRest();
  await stopRestLiveActivity();
  pushGlassesSoon();
}

export async function changeRestDuration(sec: number) {
  useAppStore.getState().selectRestPreset(sec);
  await stopRestLiveActivity();
  pushGlassesSoon();
}

export async function beginCustomRestDuration() {
  useAppStore.getState().beginCustomRest();
  await stopRestLiveActivity();
  pushGlassesSoon();
}

export async function typeCustomRest(raw: string) {
  const wasRunning = useAppStore.getState().restRunning;
  useAppStore.getState().setRestCustomRaw(raw);
  if (wasRunning && !useAppStore.getState().restRunning) {
    await stopRestLiveActivity();
    pushGlassesSoon();
  }
}

async function handleRestDone() {
  useAppStore.getState().finishRest();
  void tick('warn');
  await finishRestLiveActivity();
  pushGlassesSoon();
}

export type RestTimerSnapshot = {
  durationSec: number;
  remainingSec: number;
  phase: RestPhase;
};

export function useRestTimer(): RestTimerSnapshot {
  const durationSec = useAppStore((state) => state.restDurationSec);
  const running = useAppStore((state) => state.restRunning);
  const endTs = useAppStore((state) => state.restEndTs);
  const storedRemaining = useAppStore((state) => state.restRemainingSec);
  const [now, setNow] = useState(() => Date.now());

  const remainingSec = running && endTs
    ? remainingFromEnd(endTs, now)
    : Math.max(0, Math.round(storedRemaining));
  const phase = restPhase(running, remainingSec, durationSec);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (phase === 'done' && endTs) {
      if (doneHandledFor !== endTs) {
        doneHandledFor = endTs;
        void handleRestDone();
      }
    } else if (phase !== 'done') {
      doneHandledFor = null;
    }
  }, [phase, endTs]);

  return { durationSec, remainingSec, phase };
}
