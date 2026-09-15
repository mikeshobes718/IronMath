import { describe, expect, it } from 'vitest';
import { commercialGym, garageGym, powerliftingGym } from './defaults';
import { loadNeighbors, solveLoad } from './solve';
import { solveTargetLoad, targetLoadNeighbors } from './fitbod';
import { loadablePercentChart, percentChart } from './percent';
import { repMaxFactor, repMaxTable, estimateOneRm } from './oneRm';
import { warmupLadder, warmupScheme, WARMUP_SCHEMES, isWarmupSchemeId, repsCopy } from './warmup';
import {
  appendEntry,
  dayKey,
  entryLine,
  entryOneRm,
  entryVolume,
  groupSessions,
  liftStats,
  logToCsv,
  makeSetEntry,
  MAX_LOG_ENTRIES,
  oneRmTrend,
  personalRecords,
  prCopy,
  removeEntry,
  safeDateLabel,
  safeTimeLabel,
  sanitizeLog,
  sanitizeSleeve,
  type SetEntry,
} from './log';

const commercialLb = commercialGym().inventoryLb;
const garageLb = garageGym().inventoryLb;
const meetKg = powerliftingGym().inventoryKg;

describe('load bias', () => {
  it('never goes over the target when asked to round down', () => {
    // The lightest pair on the rack is 2.5 lb, so the bar moves in 5 lb steps
    // and 228 lb is not loadable at all. 225 is the ceiling under it.
    const down = solveLoad({ target: 228, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb, bias: 'down' });
    expect(down.loaded).toBeLessThanOrEqual(228);
    expect(down.loaded).toBe(225);
  });

  it('never comes in light when asked to round up', () => {
    const up = solveLoad({ target: 228, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb, bias: 'up' });
    expect(up.loaded).toBeGreaterThanOrEqual(228);
    expect(up.loaded).toBe(230);
  });

  it('still picks the closest load by default', () => {
    const near = solveLoad({ target: 226, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb });
    expect(near.loaded).toBe(225);
    const nearHigh = solveLoad({ target: 229, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb });
    expect(nearHigh.loaded).toBe(230);
  });

  it('breaks an exact tie toward the lighter bar', () => {
    // 227.5 sits exactly between the loadable 225 and 230.
    const tie = solveLoad({ target: 227.5, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb });
    expect(tie.loaded).toBe(225);
  });

  it('gives the heaviest it can when rounding up past the plate rack', () => {
    // A garage gym runs out well before 1000 lb.
    const up = solveLoad({ target: 1000, bar: 45, collars: 0, unit: 'lb', inventory: garageLb, bias: 'up' });
    expect(up.loaded).toBeLessThan(1000);
    expect(up.loaded).toBeGreaterThan(45);
  });

  it('keeps exact targets exact under every bias', () => {
    for (const bias of ['nearest', 'down', 'up'] as const) {
      const solved = solveLoad({ target: 225, bar: 45, collars: 0, unit: 'lb', inventory: commercialLb, bias });
      expect(solved.loaded).toBe(225);
      expect(solved.exact).toBe(true);
    }
  });

  it('solves a kilo meet bar with competition collars', () => {
    const solved = solveLoad({ target: 262.5, bar: 20, collars: 2.5, unit: 'kg', inventory: meetKg });
    expect(solved.loaded).toBe(262.5);
    expect(solved.exact).toBe(true);
  });
});

describe('micro plates', () => {
  it('uses quarter-pound plates to land a target the big plates miss', () => {
    // The garage rack has a 0.25 lb pair, so the bar moves in half-pound steps.
    const solved = solveLoad({ target: 136, bar: 45, collars: 0, unit: 'lb', inventory: garageLb });
    expect(solved.loaded).toBe(136);
    expect(solved.exact).toBe(true);
  });

  it('still solves a heavy target quickly with micro plates on the rack', () => {
    const started = Date.now();
    const solved = solveLoad({ target: 585.5, bar: 45, collars: 0, unit: 'lb', inventory: garageLb });
    expect(solved.loaded).toBe(585.5);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('keeps every sleeve within what the gym actually owns', () => {
    const solved = solveLoad({ target: 585.5, bar: 45, collars: 0, unit: 'lb', inventory: garageLb });
    for (const item of solved.plates) {
      expect(item.count).toBeLessThanOrEqual(garageLb[item.plateId]);
    }
  });
});

describe('loadable neighbours', () => {
  it('finds the next lighter and heavier bar', () => {
    const { lighter, heavier } = loadNeighbors({
      target: 225,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: commercialLb,
    });
    expect(lighter?.loaded).toBe(220);
    expect(heavier?.loaded).toBe(230);
  });

  it('reports no lighter bar once the sleeves are empty', () => {
    const { lighter } = loadNeighbors({
      target: 46,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: commercialLb,
    });
    expect(lighter).toBeNull();
  });

  it('converts neighbours back into the unit that was typed', () => {
    const { lighter, heavier } = targetLoadNeighbors({
      target: 100,
      inputUnit: 'kg',
      gymUnit: 'lb',
      bar: 45,
      collars: 0,
      inventory: commercialLb,
    });
    expect(lighter).not.toBeNull();
    expect(heavier).not.toBeNull();
    expect(lighter!.inInputUnit).toBeLessThan(100);
    expect(heavier!.inInputUnit).toBeGreaterThan(100);
    expect(lighter!.delta).toBeLessThan(0);
    expect(heavier!.delta).toBeGreaterThan(0);
  });

  it('agrees with the solver about which side it is on', () => {
    const solved = solveTargetLoad({
      target: 228,
      inputUnit: 'lb',
      gymUnit: 'lb',
      bar: 45,
      collars: 0,
      inventory: commercialLb,
    });
    const { lighter, heavier } = targetLoadNeighbors({
      target: 228,
      inputUnit: 'lb',
      gymUnit: 'lb',
      bar: 45,
      collars: 0,
      inventory: commercialLb,
    });
    expect(lighter!.loaded).toBeLessThan(solved.solution.loaded);
    expect(heavier!.loaded).toBeGreaterThan(solved.solution.loaded);
  });
});

describe('tapping a neighbour chip', () => {
  // The Load screen writes the neighbour back into the keypad rounded to one
  // decimal. Re-solving that number has to land on the same bar, or the chip
  // lies about what it does.
  const roundTrips = (target: number, inputUnit: 'lb' | 'kg', gymUnit: 'lb' | 'kg', inventory: Record<string, number>) => {
    const bar = gymUnit === 'lb' ? 45 : 20;
    const { lighter, heavier } = targetLoadNeighbors({
      target,
      inputUnit,
      gymUnit,
      bar,
      collars: 0,
      inventory,
    });
    for (const neighbor of [lighter, heavier]) {
      if (!neighbor) {
        continue;
      }
      const typed = Number(neighbor.inInputUnit.toFixed(1));
      const again = solveTargetLoad({ target: typed, inputUnit, gymUnit, bar, collars: 0, inventory });
      expect(again.solution.loaded).toBeCloseTo(neighbor.loaded, 5);
    }
  };

  it('lands on the same bar in the same unit', () => {
    for (const target of [138, 226, 317, 409, 501]) {
      roundTrips(target, 'lb', 'lb', commercialLb);
    }
  });

  it('lands on the same bar across units', () => {
    for (const target of [62.5, 100, 142.5, 187.5]) {
      roundTrips(target, 'kg', 'lb', commercialLb);
    }
    for (const target of [138, 226, 317]) {
      roundTrips(target, 'lb', 'kg', meetKg);
    }
  });

  it('lands on the same bar on a sparse garage rack', () => {
    for (const target of [96, 137, 228, 314]) {
      roundTrips(target, 'lb', 'lb', garageLb);
    }
  });
});

describe('warm-up schemes', () => {
  it('keeps the standard six-set ramp as the default', () => {
    const sets = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialLb,
    });
    expect(sets.map((set) => set.solution.loaded)).toEqual([45, 90, 135, 170, 190, 225]);
  });

  it('runs a shorter ramp on the quick scheme', () => {
    const quick = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialLb,
      scheme: 'quick',
    });
    expect(quick).toHaveLength(4);
    expect(quick[0].label).toBe('Bar');
    expect(quick[quick.length - 1].percent).toBe(1);
  });

  it('runs smaller jumps on the thorough scheme', () => {
    const thorough = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialLb,
      scheme: 'thorough',
    });
    expect(thorough).toHaveLength(7);
    const loaded = thorough.map((set) => set.solution.loaded);
    for (let i = 1; i < loaded.length; i += 1) {
      expect(loaded[i]).toBeGreaterThanOrEqual(loaded[i - 1]);
    }
  });

  it('prescribes reps on every rung but the work set', () => {
    const sets = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialLb,
    });
    expect(sets[sets.length - 1].reps).toBeNull();
    expect(sets.slice(0, -1).every((set) => typeof set.reps === 'number')).toBe(true);
    expect(repsCopy(null)).toBe('Work set');
    expect(repsCopy(5)).toBe('5 reps');
  });

  it('never goes over on any rung when the lifter rounds down', () => {
    const sets = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: garageLb,
      bias: 'down',
    });
    for (const set of sets) {
      expect(set.solution.loaded).toBeLessThanOrEqual(set.target + 0.001);
    }
  });

  it('falls back to standard for an unknown scheme id', () => {
    expect(warmupScheme(undefined).id).toBe('standard');
    expect(isWarmupSchemeId('quick')).toBe(true);
    expect(isWarmupSchemeId('nope')).toBe(false);
    expect(WARMUP_SCHEMES).toHaveLength(3);
  });
});

describe('percent chart', () => {
  it('keeps the plain chart at 50 to 100 in fives', () => {
    const rows = percentChart(300);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toEqual({ percent: 50, weight: 150 });
    expect(rows[10]).toEqual({ percent: 100, weight: 300 });
  });

  it('adds the weight the gym can actually load', () => {
    const rows = loadablePercentChart({
      oneRm: 315,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: commercialLb,
    });
    expect(rows).toHaveLength(11);
    const top = rows[rows.length - 1];
    expect(top.loaded).toBe(315);
    expect(top.exact).toBe(true);
    // 65% of 315 is 204.75, which no pair of plates hits.
    const sixtyFive = rows.find((row) => row.percent === 65)!;
    expect(sixtyFive.exact).toBe(false);
    expect(Math.abs(sixtyFive.loaded - sixtyFive.weight)).toBeLessThan(2.5);
  });

  it('honours the round-down bias in the chart', () => {
    const rows = loadablePercentChart({
      oneRm: 315,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: commercialLb,
      bias: 'down',
    });
    for (const row of rows) {
      expect(row.loaded).toBeLessThanOrEqual(row.weight + 0.001);
    }
  });
});

describe('rep max table', () => {
  it('leaves a single at the max itself', () => {
    expect(repMaxFactor(1)).toBe(1);
    expect(repMaxTable(300)[0]).toEqual({ reps: 1, weight: 300 });
  });

  it('drops as the reps climb', () => {
    const rows = repMaxTable(300);
    expect(rows).toHaveLength(10);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].weight).toBeLessThan(rows[i - 1].weight);
    }
  });

  it('round-trips against the one-rep max estimate', () => {
    const fiveRm = repMaxTable(300).find((row) => row.reps === 5)!;
    expect(estimateOneRm(fiveRm.weight, 5).average).toBeCloseTo(300, 0);
  });
});

describe('set log', () => {
  const at = (day: number, hour = 12) => new Date(2026, 0, day, hour, 0, 0).getTime();

  const squat = (day: number, weight: number, reps: number, hour = 12): SetEntry =>
    makeSetEntry({ liftId: 'squat', weight, unit: 'lb', reps, ts: at(day, hour) });

  it('clamps and rounds what it stores', () => {
    const entry = makeSetEntry({ liftId: 'bench', weight: 225.129, unit: 'lb', reps: 5.4, rpe: 8.3 });
    expect(entry.weight).toBe(225.13);
    expect(entry.reps).toBe(5);
    expect(entry.rpe).toBe(8.5);
    expect(entry.id).toBeTruthy();
  });

  it('drops an out-of-range rpe to the nearest legal one', () => {
    expect(makeSetEntry({ liftId: 'bench', weight: 100, unit: 'lb', reps: 5, rpe: 99 }).rpe).toBe(10);
    expect(makeSetEntry({ liftId: 'bench', weight: 100, unit: 'lb', reps: 5, rpe: 1 }).rpe).toBe(5);
    expect(makeSetEntry({ liftId: 'bench', weight: 100, unit: 'lb', reps: 5 }).rpe).toBeNull();
  });

  it('measures volume and estimated max in whichever unit is asked for', () => {
    const entry = squat(1, 225, 5);
    expect(entryVolume(entry, 'lb')).toBe(1125);
    expect(entryVolume(entry, 'kg')).toBeCloseTo(510.29, 1);
    expect(entryOneRm(entry, 'lb')).toBeCloseTo(estimateOneRm(225, 5).average, 5);
  });

  it('groups sets into one card per local day, newest first', () => {
    const entries = [squat(1, 225, 5, 7), squat(1, 235, 3, 19), squat(3, 245, 3)];
    const sessions = groupSessions(entries, 'lb');
    expect(sessions).toHaveLength(2);
    expect(sessions[0].key).toBe(dayKey(at(3)));
    expect(sessions[1].sets).toBe(2);
    expect(sessions[1].reps).toBe(8);
    expect(sessions[1].volume).toBe(225 * 5 + 235 * 3);
    expect(sessions[1].lifts).toEqual(['squat']);
  });

  it('summarises a lift across everything logged', () => {
    const entries = [squat(1, 225, 5), squat(3, 315, 1), squat(5, 295, 3)];
    const stats = liftStats(entries, 'squat', 'lb');
    expect(stats.sets).toBe(3);
    expect(stats.heaviest).toBe(315);
    expect(stats.heaviestEntry?.reps).toBe(1);
    // 295 x 3 estimates higher than a bare 315 single.
    expect(stats.bestOneRmEntry?.weight).toBe(295);
    expect(stats.lastEntry?.ts).toBe(at(5));
    expect(liftStats(entries, 'bench', 'lb').sets).toBe(0);
  });

  it('compares kilo and pound sets on the same scale', () => {
    const entries = [
      makeSetEntry({ liftId: 'bench', weight: 100, unit: 'kg', reps: 1, ts: at(1) }),
      makeSetEntry({ liftId: 'bench', weight: 215, unit: 'lb', reps: 1, ts: at(2) }),
    ];
    // 100 kg is 220.46 lb, so the kilo set is still the heaviest.
    expect(liftStats(entries, 'bench', 'lb').heaviest).toBeCloseTo(220.46, 1);
  });

  it('calls out a personal record and stays quiet on the first ever set', () => {
    const history = [squat(1, 225, 5)];
    const first = personalRecords([], history[0]);
    expect(first).toEqual([]);

    const heavier = squat(3, 315, 5);
    expect(personalRecords(history, heavier)).toEqual(['weight', 'e1rm']);
    expect(prCopy(personalRecords(history, heavier))).toContain('Heaviest');

    const lighterButHarder = squat(3, 226, 12);
    expect(personalRecords(history, lighterButHarder)).toEqual(['weight', 'e1rm']);

    const easy = squat(3, 135, 5);
    expect(personalRecords(history, easy)).toEqual([]);
    expect(prCopy([])).toBeNull();
  });

  it('does not count a set as beating itself', () => {
    const entry = squat(1, 225, 5);
    expect(personalRecords([entry], entry)).toEqual([]);
  });

  it('ignores other lifts when checking records', () => {
    const bench = makeSetEntry({ liftId: 'bench', weight: 405, unit: 'lb', reps: 1, ts: at(1) });
    const light = squat(2, 95, 5);
    expect(personalRecords([bench], light)).toEqual([]);
  });

  it('tracks the best estimated max per day, oldest first', () => {
    const entries = [squat(1, 225, 5, 7), squat(1, 185, 5, 19), squat(3, 245, 5)];
    const trend = oneRmTrend(entries, 'squat', 'lb');
    expect(trend).toHaveLength(2);
    expect(trend[0].ts).toBeLessThan(trend[1].ts);
    expect(trend[0].oneRm).toBeCloseTo(estimateOneRm(225, 5).average, 5);
  });

  it('appends newest first, replaces by id, and caps the history', () => {
    const one = squat(1, 225, 5);
    const two = squat(2, 235, 5);
    const list = appendEntry(appendEntry([], one), two);
    expect(list.map((entry) => entry.id)).toEqual([two.id, one.id]);

    const edited = { ...one, weight: 230 };
    expect(appendEntry(list, edited)).toHaveLength(2);
    expect(appendEntry(list, edited).find((entry) => entry.id === one.id)?.weight).toBe(230);

    let big: SetEntry[] = [];
    for (let i = 0; i < MAX_LOG_ENTRIES + 25; i += 1) {
      big = appendEntry(big, makeSetEntry({ liftId: 'squat', weight: 100, unit: 'lb', reps: 5, ts: at(1) + i }));
    }
    expect(big).toHaveLength(MAX_LOG_ENTRIES);

    expect(removeEntry(list, two.id).map((entry) => entry.id)).toEqual([one.id]);
    expect(removeEntry(list, 'missing')).toHaveLength(2);
  });

  it('throws out junk when reading storage back', () => {
    const good = squat(1, 225, 5);
    const clean = sanitizeLog([
      good,
      null,
      'nope',
      { ...good, id: 'b', ts: 'later' },
      { ...good, id: 'c', unit: 'stone' },
      { ...good, id: 'd', reps: 0 },
    ]);
    expect(clean.map((entry) => entry.id)).toEqual([good.id, 'd']);
    expect(clean.find((entry) => entry.id === 'd')?.reps).toBe(1);
    expect(sanitizeLog(undefined)).toEqual([]);
    expect(sanitizeLog({ nope: true })).toEqual([]);
  });

  it('keeps a saved reverse bar but throws out anything malformed', () => {
    const clean = sanitizeSleeve([
      { plateId: 'lb-45', weight: 45, count: 2 },
      { plateId: 'lb-25', weight: 25, count: 0 },
      { plateId: 'lb-10', weight: 'heavy', count: 1 },
      { weight: 5, count: 1 },
      null,
    ]);
    expect(clean).toEqual([{ plateId: 'lb-45', weight: 45, count: 2 }]);
    expect(sanitizeSleeve(undefined)).toEqual([]);
    expect(sanitizeSleeve('nope')).toEqual([]);
  });

  it('always produces a date and time label', () => {
    const ts = new Date(2026, 0, 5, 14, 30).getTime();
    expect(safeDateLabel(ts, { month: 'short', day: 'numeric' })).toBeTruthy();
    expect(safeTimeLabel(ts)).toBeTruthy();
  });

  it('writes a readable line and a csv', () => {
    expect(entryLine(squat(1, 225, 5))).toBe('225 LB x 5');
    expect(entryLine(makeSetEntry({ liftId: 'squat', weight: 100, unit: 'kg', reps: 3, rpe: 8, ts: at(1) }))).toBe(
      '100 KG x 3 @ RPE 8'
    );
    const csv = logToCsv([squat(2, 235, 3), squat(1, 225, 5)], () => 'Squat');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,time,lift,weight,unit,reps,rpe');
    expect(lines).toHaveLength(3);
    // Oldest first in the export, whatever order the log is in.
    expect(lines[1]).toContain('225');
    expect(lines[2]).toContain('235');
  });
});
