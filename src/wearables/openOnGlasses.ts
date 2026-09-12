import * as Linking from 'expo-linking';
import { barWeight, collarWeight, remainingFromEnd, restTimerForGlasses, type RestTimerPayload } from '../engine';
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

export type { RestTimerPayload };

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
      return 'Connect IronMath in Meta AI once. After that, Open on glasses on Load saves the weight. Keep IronMath open on the glasses to see it.';
    }
  } catch {
    // Meta AI missing. Fall through to the hosted page.
  }
  await Linking.openURL(GLASSES_WEB_APP_ORIGIN);
  return 'Opened the glasses page. In Meta AI, Add a Web App named IronMath with https://ironmath-glasses.vercel.app and no extra query.';
}

export function currentRestTimerPayload(): RestTimerPayload | null {
  const state = useAppStore.getState();
  const duration = state.restDurationSec;
  const running = state.restRunning && typeof state.restEndTs === 'number' && state.restEndTs > 0;
  const remaining = running && state.restEndTs
    ? remainingFromEnd(state.restEndTs, Date.now())
    : Math.max(0, Math.round(state.restRemainingSec));
  return restTimerForGlasses({
    end: running ? state.restEndTs : null,
    remaining,
    duration,
    running,
  });
}

let lastGlassesView: GlassesView = 'load';

type HudApiBody = {
  ok?: boolean;
  error?: string;
  search?: string;
  view?: GlassesView;
  ts?: number;
  persisted?: boolean;
};

async function readJson(response: Response): Promise<HudApiBody | null> {
  try {
    return (await response.json()) as HudApiBody;
  } catch {
    return null;
  }
}

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

async function confirmHud(posted: HudApiBody): Promise<boolean> {
  const expectedTs = Number(posted.ts);
  const expectedSearch = String(posted.search || '');
  if (!expectedTs || !expectedSearch) {
    return false;
  }
  const response = await fetch(`${GLASSES_HUD_API}?ts=${Date.now()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const got = await readJson(response);
  if (!response.ok || !got || got.ok === false) {
    return false;
  }
  return Number(got.ts) === expectedTs && String(got.search || '') === expectedSearch;
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
    const payload = await readJson(response);
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || 'Could not save this set for the glasses.');
    }
    const confirmed = await confirmHud(payload || {});
    if (!confirmed) {
      throw new Error('POST worked, but the glasses page did not keep this set. Try again.');
    }
    return 'Saved. Keep IronMath open on the glasses to see this set. The phone cannot bring that page to the front.';
  } catch (error) {
    if (error instanceof Error && error.message && !/network request failed/i.test(error.message)) {
      throw error;
    }
    throw new Error('Could not reach the glasses page. Check WiFi, then try again.');
  }
}
