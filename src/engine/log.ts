import type { LiftId } from './lifts';
import { estimateOneRm } from './oneRm';
import { convertWeight, formatWeight, roundTo, type Rounding, type Unit } from './units';

/** A single logged working set. Weight is stored in the unit it was typed in. */
export interface SetEntry {
  id: string;
  ts: number;
  liftId: LiftId;
  weight: number;
  unit: Unit;
  reps: number;
  rpe: number | null;
}

export interface SessionDay {
  key: string;
  ts: number;
  entries: SetEntry[];
  sets: number;
  reps: number;
  /** Tonnage for the day, in the unit asked for. */
  volume: number;
  lifts: LiftId[];
}

export interface LiftStats {
  liftId: LiftId;
  sets: number;
  /** Heaviest single, in the unit asked for. */
  heaviest: number;
  heaviestEntry: SetEntry | null;
  /** Best estimated one-rep max, in the unit asked for. */
  bestOneRm: number;
  bestOneRmEntry: SetEntry | null;
  volume: number;
  lastEntry: SetEntry | null;
}

export type PrKind = 'weight' | 'e1rm';

export const MAX_LOG_ENTRIES = 2000;

let sequence = 0;

export function makeEntryId(ts: number): string {
  sequence = (sequence + 1) % 1000;
  return `${ts.toString(36)}-${sequence.toString(36)}-${Math.floor(Math.random() * 46656).toString(36)}`;
}

export function makeSetEntry(input: {
  liftId: LiftId;
  weight: number;
  unit: Unit;
  reps: number;
  rpe?: number | null;
  ts?: number;
  id?: string;
}): SetEntry {
  const ts = input.ts ?? Date.now();
  const rpe = input.rpe == null ? null : clampRpe(input.rpe);
  return {
    id: input.id ?? makeEntryId(ts),
    ts,
    liftId: input.liftId,
    weight: Math.max(0, roundTo(input.weight, 2)),
    unit: input.unit,
    reps: Math.max(1, Math.min(100, Math.round(input.reps))),
    rpe,
  };
}

function clampRpe(rpe: number): number | null {
  if (!Number.isFinite(rpe)) {
    return null;
  }
  return Math.min(10, Math.max(5, Math.round(rpe * 2) / 2));
}

export function entryWeightIn(entry: SetEntry, unit: Unit): number {
  return convertWeight(entry.weight, entry.unit, unit);
}

export function entryVolume(entry: SetEntry, unit: Unit): number {
  return entryWeightIn(entry, unit) * entry.reps;
}

export function entryOneRm(entry: SetEntry, unit: Unit): number {
  return estimateOneRm(entryWeightIn(entry, unit), entry.reps).average;
}

/** Local-day bucket, so a 6am and an 8pm set land on the same card. */
export function dayKey(ts: number): string {
  const date = new Date(ts);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function groupSessions(entries: SetEntry[], unit: Unit): SessionDay[] {
  const buckets = new Map<string, SetEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.ts);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.set(key, [entry]);
    }
  }
  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const sorted = [...bucket].sort((a, b) => b.ts - a.ts);
      const lifts: LiftId[] = [];
      for (const entry of sorted) {
        if (!lifts.includes(entry.liftId)) {
          lifts.push(entry.liftId);
        }
      }
      return {
        key,
        ts: sorted[0]?.ts ?? 0,
        entries: sorted,
        sets: sorted.length,
        reps: sorted.reduce((sum, entry) => sum + entry.reps, 0),
        volume: sorted.reduce((sum, entry) => sum + entryVolume(entry, unit), 0),
        lifts,
      };
    })
    .sort((a, b) => b.ts - a.ts);
}

export function liftStats(entries: SetEntry[], liftId: LiftId, unit: Unit): LiftStats {
  const mine = entries.filter((entry) => entry.liftId === liftId);
  const stats: LiftStats = {
    liftId,
    sets: mine.length,
    heaviest: 0,
    heaviestEntry: null,
    bestOneRm: 0,
    bestOneRmEntry: null,
    volume: 0,
    lastEntry: null,
  };
  for (const entry of mine) {
    const weight = entryWeightIn(entry, unit);
    const oneRm = entryOneRm(entry, unit);
    stats.volume += weight * entry.reps;
    if (weight > stats.heaviest) {
      stats.heaviest = weight;
      stats.heaviestEntry = entry;
    }
    if (oneRm > stats.bestOneRm) {
      stats.bestOneRm = oneRm;
      stats.bestOneRmEntry = entry;
    }
    if (!stats.lastEntry || entry.ts > stats.lastEntry.ts) {
      stats.lastEntry = entry;
    }
  }
  return stats;
}

/**
 * Which records a set would break, checked against everything logged before it.
 * Called at log time so the app can say so while the lifter is still at the bar.
 */
export function personalRecords(previous: SetEntry[], candidate: SetEntry): PrKind[] {
  const before = previous.filter((entry) => entry.liftId === candidate.liftId && entry.id !== candidate.id);
  if (before.length === 0) {
    return [];
  }
  const stats = liftStats(before, candidate.liftId, 'kg');
  const kinds: PrKind[] = [];
  const weight = entryWeightIn(candidate, 'kg');
  const oneRm = entryOneRm(candidate, 'kg');
  if (weight > stats.heaviest + 0.001) {
    kinds.push('weight');
  }
  if (oneRm > stats.bestOneRm + 0.001) {
    kinds.push('e1rm');
  }
  return kinds;
}

export function prCopy(kinds: PrKind[]): string | null {
  if (kinds.length === 0) {
    return null;
  }
  if (kinds.includes('weight') && kinds.includes('e1rm')) {
    return 'Heaviest ever, and a best estimated max.';
  }
  if (kinds.includes('weight')) {
    return 'Heaviest you have logged for this lift.';
  }
  return 'Best estimated max for this lift.';
}

/** Best estimated max per day, oldest first. Feeds the trend line. */
export function oneRmTrend(
  entries: SetEntry[],
  liftId: LiftId,
  unit: Unit
): Array<{ key: string; ts: number; oneRm: number }> {
  const best = new Map<string, { key: string; ts: number; oneRm: number }>();
  for (const entry of entries) {
    if (entry.liftId !== liftId) {
      continue;
    }
    const key = dayKey(entry.ts);
    const oneRm = entryOneRm(entry, unit);
    const current = best.get(key);
    if (!current || oneRm > current.oneRm) {
      best.set(key, { key, ts: entry.ts, oneRm });
    }
  }
  return [...best.values()].sort((a, b) => a.ts - b.ts);
}

export function appendEntry(entries: SetEntry[], entry: SetEntry): SetEntry[] {
  const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
  next.sort((a, b) => b.ts - a.ts);
  return next.slice(0, MAX_LOG_ENTRIES);
}

export function removeEntry(entries: SetEntry[], id: string): SetEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function sanitizeLog(value: unknown): SetEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const clean: SetEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as Partial<SetEntry>;
    const ts = Number(raw.ts);
    const weight = Number(raw.weight);
    const reps = Number(raw.reps);
    if (!Number.isFinite(ts) || !Number.isFinite(weight) || !Number.isFinite(reps)) {
      continue;
    }
    if (typeof raw.liftId !== 'string' || (raw.unit !== 'lb' && raw.unit !== 'kg')) {
      continue;
    }
    clean.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : makeEntryId(ts),
      ts,
      liftId: raw.liftId as LiftId,
      weight: Math.max(0, weight),
      unit: raw.unit,
      reps: Math.max(1, Math.min(100, Math.round(reps))),
      rpe: raw.rpe == null ? null : clampRpe(Number(raw.rpe)),
    });
  }
  return clean.sort((a, b) => b.ts - a.ts).slice(0, MAX_LOG_ENTRIES);
}

/**
 * Hermes ships a trimmed Intl on some builds, so never let a date label be the
 * thing that crashes the log.
 */
export function safeDateLabel(ts: number, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, options);
  } catch {
    return dayKey(ts);
  }
}

export function safeTimeLabel(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    const date = new Date(ts);
    return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
  }
}

export function sanitizeSleeve(value: unknown): Array<{ plateId: string; weight: number; count: number }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const clean: Array<{ plateId: string; weight: number; count: number }> = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as { plateId?: unknown; weight?: unknown; count?: unknown };
    const weight = Number(raw.weight);
    const count = Number(raw.count);
    if (typeof raw.plateId !== 'string' || !Number.isFinite(weight) || !Number.isFinite(count)) {
      continue;
    }
    if (weight <= 0 || count <= 0) {
      continue;
    }
    clean.push({ plateId: raw.plateId, weight, count: Math.min(99, Math.round(count)) });
  }
  return clean;
}

export function entryLine(entry: SetEntry, rounding: Rounding = 0): string {
  const weight = formatWeight(entry.weight, entry.unit, rounding);
  const rpe = entry.rpe == null ? '' : ` @ RPE ${entry.rpe}`;
  return `${weight} x ${entry.reps}${rpe}`;
}

export function logToCsv(entries: SetEntry[], titleFor: (id: LiftId) => string): string {
  const rows = ['date,time,lift,weight,unit,reps,rpe'];
  for (const entry of [...entries].sort((a, b) => a.ts - b.ts)) {
    const date = new Date(entry.ts);
    const time = `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
    rows.push(
      [
        dayKey(entry.ts),
        time,
        JSON.stringify(titleFor(entry.liftId)),
        entry.weight,
        entry.unit,
        entry.reps,
        entry.rpe ?? '',
      ].join(',')
    );
  }
  return rows.join('\n');
}
