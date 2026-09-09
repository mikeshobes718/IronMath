import * as Linking from 'expo-linking';
import { barWeight, collarWeight, remainingFromEnd } from '../engine';
import { useAppStore } from '../store/useAppStore';
import {
  buildGlassesWebAppUrl,
  glassesAddDeepLink,
  GLASSES_HUD_API,
  GLASSES_WEB_APP_ORIGIN,
  searchFromGlassesUrl,
  type GlassesQueryInput,
  type GlassesView,
} from './glassesQuery';

export function currentGlassesInput(): Omit<GlassesQueryInput, 'view'> {
  const state = useAppStore.getState();
  const gym = state.gyms.find((item) => item.id === state.activeGymId) ?? state.gyms[0];
  const inventory = state.unit === 'lb' ? gym.inventoryLb : gym.inventoryKg;
  return {
    targetRaw: state.loadTargetRaw,
    inputUnit: state.loadInputUnit,
    gymUnit: state.unit,
    bar: barWeight(state.barId, state.unit, state.customBar),
    collars: collarWeight(state.collarId, state.unit),
    inventory,
    rounding: state.rounding,
    convertRaw: state.convertRaw,
    convertFrom: state.convertFrom,
  };
}

export async function addIronMathWebApp(): Promise<string> {
  const deep = glassesAddDeepLink();
  try {
    const supported = await Linking.canOpenURL(deep);
    if (supported) {
      await Linking.openURL(deep);
      return 'Meta AI should show Connect for IronMath. Do that once. After it is connected, Open on glasses on Load sends the weight to the lens.';
    }
  } catch {
    // Meta AI missing. Fall through to the hosted page.
  }
  await Linking.openURL(GLASSES_WEB_APP_ORIGIN);
  return 'Opened the glasses page. In Meta AI, Add a Web App named IronMath with https://ironmath-glasses.vercel.app and no extra query.';
}

export type RestTimerPayload = {
  end: number | null;
  remaining: number;
  duration: number;
  running: boolean;
};

export function currentRestTimerPayload(): RestTimerPayload | null {
  const state = useAppStore.getState();
  const duration = state.restDurationSec;
  const running = state.restRunning && typeof state.restEndTs === 'number' && state.restEndTs > 0;
  const remaining = running && state.restEndTs
    ? remainingFromEnd(state.restEndTs, Date.now())
    : Math.max(0, Math.round(state.restRemainingSec));
  if (!running && remaining >= duration) {
    return null;
  }
  return {
    end: running ? state.restEndTs : null,
    remaining,
    duration,
    running,
  };
}

let lastGlassesView: GlassesView = 'load';

function postHud(view: GlassesView): Promise<Response> {
  const pageUrl = buildGlassesWebAppUrl({ ...currentGlassesInput(), view });
  const search = searchFromGlassesUrl(pageUrl);
  return fetch(GLASSES_HUD_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search,
      view,
      ts: Date.now(),
      timer: currentRestTimerPayload(),
    }),
  });
}

export async function pushRestTimerToGlasses(): Promise<void> {
  try {
    await postHud(lastGlassesView);
  } catch {
    // Glasses updates are best effort. The timer still runs on the phone.
  }
}

export async function openIronMathOnGlasses(view: GlassesView): Promise<string> {
  lastGlassesView = view;
  try {
    const response = await postHud(view);
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || 'Could not send this set to the glasses.');
    }
    return 'Sent to the glasses. If the lens is blank, pick IronMath in Web Apps.';
  } catch (error) {
    if (error instanceof Error && error.message && !/network request failed/i.test(error.message)) {
      throw error;
    }
    throw new Error('Could not reach the glasses page. Check WiFi, then try again.');
  }
}
