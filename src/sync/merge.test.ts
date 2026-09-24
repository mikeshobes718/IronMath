import { describe, expect, it } from 'vitest';
import { makeSetEntry } from '../engine/log';
import {
  mergeSections,
  mergeSets,
  pickSection,
  SECTION_IDS,
  setToRow,
  type LocalSections,
  type SetRow,
} from './merge';

const set = (id: string, ts: number, weight = 100) =>
  makeSetEntry({ id, ts, liftId: 'squat', weight, unit: 'kg', reps: 5 });

const deletedRow = (id: string, at: number): SetRow => ({ ...setToRow(set(id, 1)), deleted: true, changed_at: at });

function sections(stamp = 0, unit = 'kg'): LocalSections {
  const out = {} as LocalSections;
  for (const id of SECTION_IDS) {
    out[id] = { data: id === 'settings' ? { unit } : { id }, changedAt: stamp };
  }
  return out;
}

describe('mergeSets', () => {
  it('unions phone and server logs and pushes only what the server lacks', () => {
    const result = mergeSets([set('a', 10), set('b', 20)], {}, [setToRow(set('b', 20)), setToRow(set('c', 30))]);
    expect(result.log.map((entry) => entry.id)).toEqual(['c', 'b', 'a']);
    expect(result.push.map((row) => row.entry_id)).toEqual(['a']);
  });

  it('restores everything on a fresh phone', () => {
    const server = [setToRow(set('a', 10)), setToRow(set('b', 20, 140))];
    const result = mergeSets([], {}, server);
    expect(result.log).toHaveLength(2);
    expect(result.log[0]).toMatchObject({ id: 'b', weight: 140, unit: 'kg', reps: 5 });
    expect(result.push).toEqual([]);
  });

  it('never drops a local set because the server is empty or older', () => {
    const result = mergeSets([set('a', 50)], {}, [deletedRow('a', 40)]);
    expect(result.log.map((entry) => entry.id)).toEqual(['a']);
    expect(result.push).toHaveLength(1);
    expect(result.push[0]).toMatchObject({ entry_id: 'a', deleted: false, changed_at: 50 });
  });

  it('applies a newer delete from another phone', () => {
    const result = mergeSets([set('a', 50)], {}, [deletedRow('a', 60)]);
    expect(result.log).toEqual([]);
    expect(result.tombstones).toEqual({ a: 60 });
    expect(result.push).toEqual([]);
  });

  it('pushes a local delete as a tombstone', () => {
    const result = mergeSets([], { a: 70 }, [setToRow(set('a', 50))]);
    expect(result.log).toEqual([]);
    expect(result.push).toEqual([expect.objectContaining({ entry_id: 'a', deleted: true, changed_at: 70 })]);
  });

  it('keeps the local copy on a tie', () => {
    const result = mergeSets([set('a', 50, 120)], {}, [setToRow(set('a', 50, 100))]);
    expect(result.log[0].weight).toBe(120);
    expect(result.push).toEqual([]);
  });

  it('skips server rows that do not parse instead of crashing', () => {
    const broken = { ...setToRow(set('x', 5)), unit: 'stone' };
    const result = mergeSets([], {}, [broken]);
    expect(result.log).toEqual([]);
  });
});

describe('mergeSections', () => {
  it('lets the server win on a fresh phone', () => {
    const result = mergeSections(sections(0, 'kg'), [{ section: 'settings', data: { unit: 'lb' }, changed_at: 5 }], 1000);
    expect(result.apply.settings).toEqual({ unit: 'lb' });
    expect(result.stamps.settings).toBe(5);
    expect(result.push.find((row) => row.section === 'settings')).toBeUndefined();
  });

  it('uploads an untouched phone stamped now when the server is empty', () => {
    const result = mergeSections(sections(0), [], 1000);
    expect(result.push).toHaveLength(SECTION_IDS.length);
    expect(result.push.every((row) => row.changed_at === 1000)).toBe(true);
    expect(result.stamps.settings).toBe(1000);
  });

  it('newest wins per section', () => {
    const local = sections(100, 'kg');
    local.gym.changedAt = 10;
    const server = [
      { section: 'settings', data: { unit: 'lb' }, changed_at: 50 },
      { section: 'gym', data: { activeGymId: 'home' }, changed_at: 90 },
    ];
    const result = mergeSections(local, server, 1000);
    expect(result.apply.settings).toBeUndefined();
    expect(result.apply.gym).toEqual({ activeGymId: 'home' });
    expect(result.push.map((row) => row.section)).toContain('settings');
    expect(result.push.map((row) => row.section)).not.toContain('gym');
  });
});

describe('pickSection', () => {
  it('only takes synced keys, never the running rest timer', () => {
    const picked = pickSection({ unit: 'lb', restRunning: true, restEndTs: 5, restDurationSec: 90 }, 'settings');
    expect(picked.unit).toBe('lb');
    expect(picked.restDurationSec).toBe(90);
    expect('restRunning' in picked).toBe(false);
    expect('restEndTs' in picked).toBe(false);
  });
});
