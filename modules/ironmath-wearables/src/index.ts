import { requireNativeModule } from 'expo-modules-core';

export type GlassesHudPayload = {
  targetLabel: string;
  loadedLabel: string;
  otherLoadedLabel: string;
  eachSide: string;
  miss: string;
  convertLb: string;
  convertKg: string;
  bumpStep: string;
};

export type WearablesStatus = {
  available: boolean;
  configured: boolean;
  registration: string;
  display: string;
  lastError: string;
};

export type HudAction = {
  type: 'bump';
  delta: number;
};

type NativeWearables = {
  configure(): Promise<string>;
  startRegistration(): Promise<string>;
  startUnregistration(): Promise<string>;
  handleUrl(url: string): Promise<string>;
  connectDisplay(): Promise<string>;
  disconnectDisplay(): Promise<string>;
  sendHud(payload: GlassesHudPayload): Promise<string>;
  openGlassesAppUpdate(): Promise<string>;
  getStatus(): Promise<WearablesStatus | Record<string, string>>;
  addListener?(event: 'onHudAction', listener: (action: HudAction) => void): { remove: () => void };
};

function asBool(value: unknown): boolean {
  return value === true || value === 'true';
}

function normalizeStatus(raw: WearablesStatus | Record<string, string>): WearablesStatus {
  return {
    available: asBool(raw.available),
    configured: asBool(raw.configured),
    registration: String(raw.registration ?? 'unknown'),
    display: String(raw.display ?? 'idle'),
    lastError: String(raw.lastError ?? ''),
  };
}

function loadNative(): NativeWearables | null {
  try {
    return requireNativeModule<NativeWearables>('IronMathWearables');
  } catch {
    return null;
  }
}

let native: NativeWearables | null | undefined;

function getNative(): NativeWearables | null {
  if (native !== undefined) {
    return native;
  }
  native = loadNative();
  return native;
}

export function wearablesAvailable(): boolean {
  return getNative() != null;
}

export async function configureWearables(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.configure();
}

export async function startRegistration(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.startRegistration();
}

export async function startUnregistration(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.startUnregistration();
}

export async function handleWearablesUrl(url: string): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.handleUrl(url);
}

export async function connectDisplay(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.connectDisplay();
}

export async function disconnectDisplay(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.disconnectDisplay();
}

export async function sendGlassesHud(payload: GlassesHudPayload): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.sendHud(payload);
}

export async function openGlassesAppUpdate(): Promise<string> {
  const module = getNative();
  if (!module) {
    return 'unavailable';
  }
  return module.openGlassesAppUpdate();
}

export async function getWearablesStatus(): Promise<WearablesStatus> {
  const module = getNative();
  if (!module) {
    return {
      available: false,
      configured: false,
      registration: 'unavailable',
      display: 'unavailable',
      lastError: '',
    };
  }
  return normalizeStatus(await Promise.resolve(module.getStatus()));
}

export function addHudActionListener(listener: (action: HudAction) => void) {
  const module = getNative();
  if (!module?.addListener) {
    return { remove: () => undefined };
  }
  return module.addListener('onHudAction', listener);
}
