import { describe, expect, it } from 'vitest';
import { planAttempts } from './attempts';
import { englishBreakdown, missCopy } from './breakdown';
import { commercialGym, garageGym } from './defaults';
import { estimateOneRm } from './oneRm';
import { loadFromRpe, percentAt, rirFromRpe } from './rpe';
import { dotsScore, ipfGlPoints } from './scoring';
import { addPair, canAddPair, solveLoad, totalFromSleeve } from './solve';
import { appendKey, formatDual, kgToLb, lbToKg, parseKeypad } from './units';
import { minSwap, warmupLadder } from './warmup';

const unlimitedLb = commercialGym().inventoryLb;

describe('units', () => {
  it('converts 315 lb to kg', () => {
    expect(lbToKg(315)).toBeCloseTo(142.8816, 3);
    expect(kgToLb(100)).toBeCloseTo(220.4623, 3);
  });

  it('formats dual readouts', () => {
    expect(formatDual(315, 'lb', 1)).toContain('315');
    expect(formatDual(315, 'lb', 1)).toContain('KG');
  });

  it('parses keypad input', () => {
    expect(appendKey('', '3')).toBe('3');
    expect(appendKey('3', '1')).toBe('31');
    expect(appendKey('31', '5')).toBe('315');
    expect(appendKey('315', 'back')).toBe('31');
    expect(appendKey('31', '.')).toBe('31.');
    expect(appendKey('31.', '.')).toBe('31.');
    expect(parseKeypad('315')).toBe(315);
  });
});

describe('plate solver', () => {
  it('loads 315 on a 45 bar with three 45s per sleeve', () => {
    const result = solveLoad({
      target: 315,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: unlimitedLb,
    });
    expect(result.exact).toBe(true);
    expect(result.loaded).toBe(315);
    expect(result.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 3 }]);
  });

  it('loads 225 and 135', () => {
    const two25 = solveLoad({ target: 225, bar: 45, collars: 0, unit: 'lb', inventory: unlimitedLb });
    const one35 = solveLoad({ target: 135, bar: 45, collars: 0, unit: 'lb', inventory: unlimitedLb });
    expect(two25.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 2 }]);
    expect(one35.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 1 }]);
  });

  it('includes competition collars in the total', () => {
    const result = solveLoad({
      target: 320.5,
      bar: 45,
      collars: 5.5,
      unit: 'lb',
      inventory: unlimitedLb,
    });
    expect(result.exact).toBe(true);
    expect(result.loaded).toBe(320.5);
    expect(result.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 3 }]);
  });

  it('uses change plates for 100 lb', () => {
    const result = solveLoad({
      target: 100,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: unlimitedLb,
    });
    expect(result.exact).toBe(true);
    expect(result.loaded).toBe(100);
    expect(result.perSleeve).toBe(27.5);
  });

  it('picks the closest overshoot when only 45s are available', () => {
    const result = solveLoad({
      target: 100,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: { 'lb-45': 4 },
    });
    expect(result.exact).toBe(false);
    expect(result.loaded).toBe(135);
    expect(missCopy(result.delta, 'lb')).toContain('missed');
  });

  it('reports a miss when the garage gym cannot hit 700', () => {
    const result = solveLoad({
      target: 700,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: garageGym().inventoryLb,
    });
    expect(result.exact).toBe(false);
    expect(result.loaded).toBeLessThan(700);
    expect(result.loaded).toBeGreaterThan(45);
    expect(missCopy(result.delta, 'lb')).toContain('missed');
  });

  it('returns the bar when the target is below bar weight', () => {
    const result = solveLoad({
      target: 20,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: unlimitedLb,
    });
    expect(result.plates).toEqual([]);
    expect(result.loaded).toBe(45);
    expect(result.delta).toBe(25);
  });

  it('loads fractional plates for 46.5', () => {
    const result = solveLoad({
      target: 46.5,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: {
        ...garageGym().inventoryLb,
        'lb-0.5': 2,
        'lb-0.25': 2,
      },
    });
    expect(result.loaded).toBe(46.5);
    expect(result.exact).toBe(true);
    expect(result.perSleeve).toBe(0.75);
  });

  it('picks the closest load when an exact 0.25 pair is missing', () => {
    const result = solveLoad({
      target: 46.25,
      bar: 45,
      collars: 0,
      unit: 'lb',
      inventory: {
        'lb-45': 0,
        'lb-0.5': 2,
        'lb-0.25': 0,
      },
    });
    expect(result.exact).toBe(false);
    expect(result.loaded).toBe(46);
    expect(result.delta).toBeCloseTo(-0.25, 5);
  });

  it('solves a 100 kg bar load', () => {
    const result = solveLoad({
      target: 100,
      bar: 20,
      collars: 0,
      unit: 'kg',
      inventory: commercialGym().inventoryKg,
    });
    expect(result.exact).toBe(true);
    expect(result.loaded).toBe(100);
    expect(result.perSleeve).toBe(40);
  });

  it('writes a plain English breakdown', () => {
    const result = solveLoad({
      target: 300,
      bar: 45,
      collars: 5.5,
      unit: 'lb',
      inventory: unlimitedLb,
    });
    const copy = englishBreakdown(result.bar, result.collars, result.plates, result.loaded, 'lb');
    expect(copy).toContain('45 bar');
    expect(copy).toContain('2x(');
    expect(copy).toContain('5.5 collars');
  });
});

describe('reverse calculator', () => {
  it('adds and totals pairs in real time', () => {
    let sleeve = addPair([], 'lb-45');
    sleeve = addPair(sleeve, 'lb-45');
    sleeve = addPair(sleeve, 'lb-25');
    expect(totalFromSleeve(45, 0, sleeve)).toBe(275);
    expect(canAddPair({ 'lb-45': 2 }, sleeve, 'lb-45')).toBe(false);
  });
});

describe('warm-up and min swap', () => {
  it('builds a 6-set ladder and swap hints', () => {
    const sets = warmupLadder({
      workingWeight: 315,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: unlimitedLb,
    });
    expect(sets).toHaveLength(6);
    expect(sets[0].label).toBe('Bar');
    expect(sets[5].solution.loaded).toBe(315);
    expect(sets[1].swap.copy.toLowerCase()).toContain('add');
  });

  it('describes keep/add/remove between two sleeves', () => {
    const from = [{ plateId: 'lb-45', weight: 45, count: 2 }];
    const to = [
      { plateId: 'lb-45', weight: 45, count: 2 },
      { plateId: 'lb-25', weight: 25, count: 1 },
    ];
    const hint = minSwap(from, to);
    expect(hint.keep).toEqual([{ plateId: 'lb-45', weight: 45, count: 2 }]);
    expect(hint.add).toEqual([{ plateId: 'lb-25', weight: 25, count: 1 }]);
    expect(hint.copy).toContain('Keep');
    expect(hint.copy).toContain('add');
  });
});

describe('strength tools', () => {
  it('estimates 1RM with Brzycki and Epley', () => {
    const result = estimateOneRm(225, 5);
    expect(result.brzycki).toBeCloseTo(253.125, 3);
    expect(result.epley).toBeCloseTo(262.5, 3);
    expect(result.average).toBeCloseTo(257.8125, 3);
  });

  it('converts RPE and RIR', () => {
    expect(percentAt(1, 10)).toBe(100);
    expect(percentAt(5, 8)).toBe(80.4);
    expect(rirFromRpe(8)).toBe(2);
    expect(loadFromRpe(315, 1, 9)).toBeCloseTo(300.825, 2);
  });

  it('scores DOTS and IPF GL', () => {
    const gl = ipfGlPoints(700, 90, 'male', 'classic', 'powerlifting');
    expect(gl).toBeGreaterThan(90);
    expect(gl).toBeLessThan(96);
    const dots = dotsScore(700, 90, 'male');
    expect(dots).toBeGreaterThan(400);
  });

  it('plans meet attempts from a third', () => {
    const plan = planAttempts(250);
    expect(plan.opener).toBeCloseTo(227.5, 5);
    expect(plan.second).toBeCloseTo(242.5, 5);
    expect(plan.third).toBeCloseTo(252.5, 5);
  });
});
