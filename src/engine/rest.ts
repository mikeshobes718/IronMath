export const REST_PRESETS = [60, 120, 180] as const;
export const REST_CUSTOM_ID = 'custom';
export const DEFAULT_REST_SEC = 60;
export const DEFAULT_CUSTOM_REST_SEC = 135;
export const MIN_REST_SEC = 5;
export const MAX_REST_SEC = 1800;

export type RestPhase = 'idle' | 'running' | 'paused' | 'done';

export function isRestPreset(sec: number): boolean {
  return (REST_PRESETS as readonly number[]).includes(sec);
}

export function clampRestDuration(sec: number): number {
  if (!Number.isFinite(sec)) {
    return DEFAULT_REST_SEC;
  }
  return Math.min(MAX_REST_SEC, Math.max(MIN_REST_SEC, Math.round(sec)));
}

export function formatRestClock(totalSec: number): string {
  const safe = Math.max(0, Math.ceil(Number.isFinite(totalSec) ? totalSec : 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function normalizeRestRaw(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('.', ':');
}

export function parseCustomRest(raw: string): number | null {
  const text = normalizeRestRaw(raw);
  if (!text) {
    return null;
  }

  const secSuffix = text.match(/^(\d+)s(?:ec(?:onds?)?)?$/);
  if (secSuffix) {
    const n = Number(secSuffix[1]);
    return Number.isFinite(n) ? n : null;
  }

  if (/^\d+:$/.test(text)) {
    return null;
  }

  const clock = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (clock) {
    const minutes = Number(clock[1]);
    const seconds = Number(clock[2]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export function customRestLooksComplete(raw: string): boolean {
  const text = normalizeRestRaw(raw);
  if (!text) {
    return false;
  }
  if (/^\d+s(?:ec(?:onds?)?)?$/.test(text)) {
    return true;
  }
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    return true;
  }
  if (/^\d{2,4}$/.test(text)) {
    return true;
  }
  return false;
}

export function applyCustomRest(raw: string): number | null {
  const parsed = parseCustomRest(raw);
  if (parsed === null) {
    return null;
  }
  return clampRestDuration(parsed);
}

export function appendRestKey(raw: string, key: string): string {
  const value = String(raw ?? '').replace('.', ':');
  if (key === 'back') {
    return value.slice(0, -1);
  }
  if (key === 'clear') {
    return '';
  }
  if (key === '.') {
    if (value.includes(':')) {
      return value;
    }
    return value.length === 0 ? '0:' : `${value}:`;
  }
  if (!/^\d$/.test(key)) {
    return value;
  }
  const colon = value.indexOf(':');
  if (colon >= 0) {
    const seconds = value.slice(colon + 1);
    if (seconds.length >= 2) {
      return value;
    }
    return `${value}${key}`;
  }
  if (value.length >= 4) {
    return value;
  }
  if (value === '0') {
    return key;
  }
  return `${value}${key}`;
}

export function remainingFromEnd(endTs: number, now: number): number {
  return Math.max(0, Math.ceil((endTs - now) / 1000));
}

export function restPhase(running: boolean, remainingSec: number, durationSec: number): RestPhase {
  if (running) {
    return remainingSec <= 0 ? 'done' : 'running';
  }
  if (remainingSec <= 0) {
    return 'done';
  }
  return remainingSec >= durationSec ? 'idle' : 'paused';
}

export function restIsPaused(running: boolean, remainingSec: number, durationSec: number): boolean {
  return restPhase(running, remainingSec, durationSec) === 'paused';
}

export type RestTimerPayload = {
  end: number | null;
  remaining: number;
  duration: number;
  running: boolean;
};

export function restTimerForGlasses(input: {
  end: number | null;
  remaining: number;
  duration: number;
  running: boolean;
}): RestTimerPayload | null {
  const duration = Number(input.duration);
  const remaining = Number(input.remaining);
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const phase = restPhase(input.running === true, remaining, duration);
  if (phase === 'idle' || phase === 'done') {
    return null;
  }
  let end = input.end === null || input.end === undefined ? null : Number(input.end);
  if (end !== null && !Number.isFinite(end)) {
    end = null;
  }
  return {
    end: input.running && end ? end : null,
    remaining: Math.max(0, Math.min(remaining, duration)),
    duration,
    running: input.running === true,
  };
}
