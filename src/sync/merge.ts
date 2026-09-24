import type { LiftId } from '../engine/lifts';
import { sanitizeLog, type SetEntry } from '../engine/log';

/** One row of the Berth `lift_sets` table. owner_id is filled in by Berth from the user token. */
export interface SetRow {
  entry_id: string;
  ts: number;
  lift_id: string;
  weight: number;
  unit: string;
  reps: number;
  rpe: number | null;
  deleted: boolean;
  changed_at: number;
}

/** One row of the Berth `user_state` table: a whole settings section, newest wins. */
export interface StateRow {
  section: string;
  data: Record<string, unknown>;
  changed_at: number;
}

export const SYNC_SECTIONS = {
  settings: [
    'unit',
    'barId',
    'customBar',
    'collarId',
    'plateTheme',
    'rounding',
    'loadBias',
    'warmupSchemeId',
    'hapticsEnabled',
    'audioEnabled',
    'appearance',
    'autoRestOnLog',
    'restDurationSec',
    'restUsingCustom',
    'restCustomRaw',
  ],
  gym: ['activeGymId', 'gyms'],
  lifts: ['lifts'],
  club: ['club'],
  profile: ['name'],
} as const;

export type SectionId = keyof typeof SYNC_SECTIONS;
export const SECTION_IDS = Object.keys(SYNC_SECTIONS) as SectionId[];

export type LocalSection = { data: Record<string, unknown>; changedAt: number };
export type LocalSections = Record<SectionId, LocalSection>;
export type SectionStamps = Partial<Record<SectionId, number>>;

export function pickSection(state: object, section: SectionId): Record<string, unknown> {
  const source = state as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SYNC_SECTIONS[section]) {
    out[key] = source[key];
  }
  return out;
}

export function sectionFingerprint(state: object, section: SectionId): string {
  return JSON.stringify(pickSection(state, section));
}

export function setToRow(entry: SetEntry): SetRow {
  return {
    entry_id: entry.id,
    ts: entry.ts,
    lift_id: entry.liftId,
    weight: entry.weight,
    unit: entry.unit,
    reps: entry.reps,
    rpe: entry.rpe,
    deleted: false,
    changed_at: entry.ts,
  };
}

export function rowToSet(row: SetRow): SetEntry | null {
  const [entry] = sanitizeLog([
    {
      id: row.entry_id,
      ts: Number(row.ts),
      liftId: row.lift_id as LiftId,
      weight: Number(row.weight),
      unit: row.unit,
      reps: Number(row.reps),
      rpe: row.rpe,
    },
  ]);
  return entry ?? null;
}

function tombstoneRow(id: string, deletedAt: number, base?: SetRow | SetEntry): SetRow {
  const row = base && 'entry_id' in base ? base : base ? setToRow(base) : null;
  return {
    entry_id: id,
    ts: row?.ts ?? deletedAt,
    lift_id: row?.lift_id ?? 'squat',
    weight: row?.weight ?? 0,
    unit: row?.unit ?? 'kg',
    reps: row?.reps ?? 1,
    rpe: row?.rpe ?? null,
    deleted: true,
    changed_at: deletedAt,
  };
}

export interface SetMerge {
  log: SetEntry[];
  tombstones: Record<string, number>;
  push: SetRow[];
}

/**
 * Union of the phone log and the server log, newest change wins per set.
 * A local set only goes away when the server holds a delete that is newer than it,
 * which means the lifter deleted it on another phone. Ties keep the local copy.
 */
export function mergeSets(
  local: SetEntry[],
  localTombstones: Record<string, number>,
  server: SetRow[]
): SetMerge {
  const serverById = new Map<string, SetRow>();
  for (const row of server) {
    const current = serverById.get(row.entry_id);
    if (!current || Number(row.changed_at) > Number(current.changed_at)) {
      serverById.set(row.entry_id, row);
    }
  }
  const localById = new Map<string, SetEntry>();
  for (const entry of local) {
    localById.set(entry.id, entry);
  }
  const ids = new Set<string>([...serverById.keys(), ...localById.keys(), ...Object.keys(localTombstones)]);

  const log: SetEntry[] = [];
  const tombstones: Record<string, number> = {};
  const push: SetRow[] = [];

  for (const id of ids) {
    const entry = localById.get(id);
    const deletedAt = localTombstones[id];
    const remote = serverById.get(id);

    let localSide: { deleted: boolean; changedAt: number } | null = null;
    if (deletedAt != null && (!entry || deletedAt >= entry.ts)) {
      localSide = { deleted: true, changedAt: deletedAt };
    } else if (entry) {
      localSide = { deleted: false, changedAt: entry.ts };
    }

    const remoteWins = remote != null && (localSide == null || Number(remote.changed_at) > localSide.changedAt);
    if (remoteWins && remote) {
      if (remote.deleted) {
        tombstones[id] = Number(remote.changed_at);
      } else {
        const restored = rowToSet(remote);
        if (restored) {
          log.push(restored);
        }
      }
      continue;
    }
    if (!localSide) {
      continue;
    }
    if (localSide.deleted) {
      tombstones[id] = localSide.changedAt;
    } else if (entry) {
      log.push(entry);
    }
    const inSync =
      remote != null &&
      Number(remote.changed_at) === localSide.changedAt &&
      Boolean(remote.deleted) === localSide.deleted;
    if (!inSync) {
      push.push(localSide.deleted ? tombstoneRow(id, localSide.changedAt, remote ?? entry) : setToRow(entry!));
    }
  }

  log.sort((a, b) => b.ts - a.ts);
  return { log, tombstones, push };
}

export interface SectionMerge {
  apply: Partial<Record<SectionId, Record<string, unknown>>>;
  stamps: Record<SectionId, number>;
  push: StateRow[];
}

/**
 * Newest wins per section. A section the phone never changed has stamp 0, so on a
 * fresh phone the server copy always wins, and on the first sign-in of an old phone
 * with an empty server the phone copy goes up stamped `now`, so it beats the defaults
 * of the next fresh phone.
 */
export function mergeSections(local: LocalSections, server: StateRow[], now = Date.now()): SectionMerge {
  const serverById = new Map<string, StateRow>();
  for (const row of server) {
    const current = serverById.get(row.section);
    if (!current || Number(row.changed_at) > Number(current.changed_at)) {
      serverById.set(row.section, row);
    }
  }
  const apply: SectionMerge['apply'] = {};
  const stamps = {} as Record<SectionId, number>;
  const push: StateRow[] = [];
  for (const section of SECTION_IDS) {
    const mine = local[section];
    const remote = serverById.get(section);
    if (remote && remote.data && typeof remote.data === 'object' && Number(remote.changed_at) > mine.changedAt) {
      apply[section] = remote.data;
      stamps[section] = Number(remote.changed_at);
      continue;
    }
    if (!remote || mine.changedAt > Number(remote.changed_at)) {
      const changedAt = mine.changedAt > 0 ? mine.changedAt : now;
      stamps[section] = changedAt;
      push.push({ section, data: mine.data, changed_at: changedAt });
    } else {
      stamps[section] = mine.changedAt;
    }
  }
  return { apply, stamps, push };
}
