import { describe, expect, it } from 'vitest';
import { planAttempts } from './attempts';
import { clubOtherCopy, clubProgress } from './club';
import { englishBreakdown, missCopy } from './breakdown';
import { commercialGym, garageGym } from './defaults';
import { estimateOneRm } from './oneRm';
import { loadFromRpe, percentAt, rirFromRpe } from './rpe';
import { dotsScore, ipfGlPoints } from './scoring';
import { solveTargetLoad } from './fitbod';
import { addPair, canAddPair, solveLoad, totalFromSleeve } from './solve';
import { appendKey, formatDual, kgToLb, lbToKg, parseKeypad, rawForUnitChange, roundGymLoad } from './units';
import { minSwap, warmupLadder } from './warmup';
import { bumpTargetRaw, buildGlanceHud } from './glance';
import {
  appendRestKey,
  applyCustomRest,
  clampRestDuration,
  customRestLooksComplete,
  DEFAULT_REST_SEC,
  formatRestClock,
  isRestPreset,
  REST_PRESETS,
  MAX_REST_SEC,
  MIN_REST_SEC,
  parseCustomRest,
  remainingFromEnd,
  restPhase,
} from './rest';
import {
  buildGlassesWebAppUrl,
  glassesAddDeepLink,
  GLASSES_WEB_APP_ORIGIN,
  hudFromSearch,
} from '../wearables/glassesQuery';

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

  it('rounds unit switches to gym 2.5 steps', () => {
    expect(roundGymLoad(102.058)).toBe(102.5);
    expect(roundGymLoad(225.09)).toBe(225);
    expect(rawForUnitChange(225, 'lb', 'kg')).toBe('102.5');
    expect(rawForUnitChange(102.5, 'kg', 'lb')).toBe('225');
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
    expect(sets[1].swap.thisSet.toLowerCase()).toContain('side');
    expect(sets[1].swap.fromLast).toBeNull();
  });

  it('loads 225 lb on pound plates, not kilo conversions', () => {
    const sets = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialGym().inventoryLb,
    });
    const top = sets[sets.length - 1];
    expect(top.percent).toBe(1);
    expect(top.solution.loaded).toBe(225);
    expect(top.solution.unit).toBe('lb');
    expect(top.solution.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 2 }]);
    const math = englishBreakdown(45, 0, top.solution.plates, top.solution.loaded, 'lb');
    expect(math).toContain('45 bar');
    expect(math).toContain('225 LB');
    expect(math).not.toContain('KG');
    const eightyFive = sets.find((set) => set.percent === 0.85);
    expect(eightyFive).toBeTruthy();
    expect(eightyFive!.solution.unit).toBe('lb');
    expect(eightyFive!.solution.plates).toEqual([
      { plateId: 'lb-45', weight: 45, count: 1 },
      { plateId: 'lb-25', weight: 25, count: 1 },
      { plateId: 'lb-2.5', weight: 2.5, count: 1 },
    ]);
    expect(eightyFive!.swap.thisSet).not.toMatch(/\b20\b/);
    expect(eightyFive!.swap.fromLast ?? '').not.toMatch(/\b20\b/);
  });

  it('describes this set first on a 225 lb ladder', () => {
    const sets = warmupLadder({
      workingWeight: 225,
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      unit: 'lb',
      inventory: commercialGym().inventoryLb,
    });
    const loaded = sets.map((set) => set.solution.loaded);
    expect(loaded).toEqual([45, 90, 135, 170, 190, 225]);
    expect(sets.map((set) => set.swap.thisSet)).toEqual([
      'Bar only',
      'Each side: 10 + 10 + 2.5',
      'One 45 per side',
      'Each side: 25 + 25 + 10 + 2.5',
      'Each side: 45 + 25 + 2.5',
      'Two 45s per side',
    ]);
    expect(sets.map((set) => set.swap.fromLast)).toEqual([
      null,
      null,
      'From last set: take off the 10s and the 2.5, put on a 45.',
      'From last set: take off the 45, put on the 25s, a 10, and a 2.5.',
      'From last set: take off the 25 and the 10, put on a 45.',
      'From last set: take off the 25 and the 2.5, put on a 45.',
    ]);
    const one35 = sets[2];
    expect(one35.solution.plates).toEqual([{ plateId: 'lb-45', weight: 45, count: 1 }]);
    expect(one35.swap.thisSet).not.toMatch(/2\.5|10/);
    expect(one35.swap.fromLast).toMatch(/^From last set:/);
    const top = sets[5];
    const math = englishBreakdown(45, 0, top.solution.plates, top.solution.loaded, 'lb');
    expect(math).toBe('45 bar + 2x(45 + 45) = 225 LB');
    expect(math).not.toContain('KG');
    for (const set of sets) {
      const line = `${set.swap.thisSet} ${set.swap.fromLast ?? ''}`;
      expect(line).not.toMatch(/[—–]/);
      if (set.swap.fromLast) {
        expect(set.swap.fromLast.startsWith('From last set:')).toBe(true);
      }
    }
  });

  it('describes this set first on a 100 kg ladder', () => {
    const sets = warmupLadder({
      workingWeight: 100,
      barId: 'oly',
      customBar: 20,
      collarId: 'none',
      unit: 'kg',
      inventory: commercialGym().inventoryKg,
    });
    expect(sets.map((set) => set.solution.loaded)).toEqual([20, 40, 60, 75, 85, 100]);
    expect(sets.every((set) => set.solution.plates.every((item) => item.plateId.startsWith('kg-')))).toBe(true);
    expect(sets.map((set) => set.swap.thisSet)).toEqual([
      'Bar only',
      'One 10 per side',
      'One 20 per side',
      'Each side: 25 + 2.5',
      'Each side: 15 + 15 + 2.5',
      'Two 20s per side',
    ]);
    expect(sets[2].swap.fromLast).toBe('From last set: take off the 10, put on a 20.');
    expect(sets[5].swap.fromLast).toBe('From last set: take off the 15s and the 2.5, put on the 20s.');
    const math = englishBreakdown(20, 0, sets[5].solution.plates, sets[5].solution.loaded, 'kg');
    expect(math).toBe('20 bar + 2x(20 + 20) = 100 KG');
    expect(math).not.toContain('LB');
    for (const set of sets) {
      const line = `${set.swap.thisSet} ${set.swap.fromLast ?? ''}`;
      expect(line).not.toMatch(/\bLB\b/);
      expect(line).not.toMatch(/[—–]/);
    }
  });

  it('loads 100 kg on kilo plates when the unit is kg', () => {
    const sets = warmupLadder({
      workingWeight: 100,
      barId: 'oly',
      customBar: 20,
      collarId: 'none',
      unit: 'kg',
      inventory: commercialGym().inventoryKg,
    });
    const top = sets[sets.length - 1];
    expect(top.solution.loaded).toBe(100);
    expect(top.solution.unit).toBe('kg');
    expect(top.solution.plates.every((item) => item.plateId.startsWith('kg-'))).toBe(true);
    const math = englishBreakdown(20, 0, top.solution.plates, top.solution.loaded, 'kg');
    expect(math).toContain('20 bar');
    expect(math).toContain('100 KG');
    expect(math).not.toContain('LB');
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
    expect(hint.thisSet).toBe('Each side: 45 + 45 + 25');
    expect(hint.fromLast).toBe('From last set: put on a 25.');
    expect(hint.copy).toBe(hint.thisSet);
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

  it('matches a pound or kilo target to gym plates', () => {
    const fromLb = solveTargetLoad({
      target: 225,
      inputUnit: 'lb',
      gymUnit: 'kg',
      bar: 20,
      collars: 0,
      inventory: commercialGym().inventoryKg,
    });
    expect(fromLb.solution.loaded).toBeGreaterThan(90);
    expect(fromLb.loadedLb).toBeCloseTo(fromLb.solution.loaded * (1 / 0.45359237), 5);
    const fromKg = solveTargetLoad({
      target: 100,
      inputUnit: 'kg',
      gymUnit: 'kg',
      bar: 20,
      collars: 0,
      inventory: commercialGym().inventoryKg,
    });
    expect(fromKg.solution.loaded).toBe(100);
    expect(fromKg.deltaInput).toBeCloseTo(0, 5);
  });

  it('does not say the other-unit club is still ahead when already past', () => {
    const lb = clubProgress(1152.5, 'lb');
    expect(lb.reached).toBe(true);
    expect(lb.otherReached).toBe(true);
    expect(lb.otherRemaining).toBe(0);
    expect(clubOtherCopy(lb.otherTotal, lb.otherUnit, (value, unit) => `${value.toFixed(1)} ${unit === 'kg' ? 'KG' : 'LB'}`)).toMatch(
      /past 500 KG\.$/
    );
    expect(clubOtherCopy(lb.otherTotal, lb.otherUnit, (value, unit) => `${value.toFixed(1)} ${unit === 'kg' ? 'KG' : 'LB'}`)).not.toMatch(
      /toward/
    );

    const kg = clubProgress(522.5, 'kg');
    expect(kg.reached).toBe(true);
    expect(kg.otherReached).toBe(true);
    expect(clubOtherCopy(kg.otherTotal, kg.otherUnit, (value, unit) => `${value.toFixed(1)} ${unit === 'kg' ? 'KG' : 'LB'}`)).toMatch(
      /past 1000 LB\.$/
    );
  });

  it('says how much is left in the other unit when still short', () => {
    const lb = clubProgress(1050, 'lb');
    expect(lb.reached).toBe(true);
    expect(lb.otherReached).toBe(false);
    expect(clubOtherCopy(lb.otherTotal, lb.otherUnit, (value, unit) => `${value.toFixed(1)} ${unit === 'kg' ? 'KG' : 'LB'}`)).toMatch(
      /to go to 500 KG\.$/
    );
    expect(clubOtherCopy(lb.otherTotal, lb.otherUnit, (value, unit) => `${value.toFixed(1)} ${unit === 'kg' ? 'KG' : 'LB'}`)).not.toMatch(
      /toward/
    );
  });

  it('plans meet attempts from a third', () => {
    const plan = planAttempts(250);
    expect(plan.opener).toBeCloseTo(227.5, 5);
    expect(plan.second).toBeCloseTo(242.5, 5);
    expect(plan.third).toBeCloseTo(252.5, 5);
  });
});

describe('glance hud', () => {
  it('shows plates plus both convert units for 225 lb', () => {
    const gym = commercialGym();
    const hud = buildGlanceHud({
      targetRaw: '225',
      inputUnit: 'lb',
      gymUnit: 'kg',
      bar: 20,
      collars: 0,
      inventory: gym.inventoryKg,
      rounding: 1,
      convertRaw: '225',
      convertFrom: 'lb',
    });
    expect(hud.loadedLabel).toContain('KG');
    expect(hud.otherLoadedLabel).toContain('LB');
    expect(hud.convertLb).toContain('225');
    expect(hud.convertKg).toContain('KG');
    expect(hud.eachSide.toLowerCase()).toContain('each side');
    expect(hud.lockTitle).toBe(hud.loadedLabel);
  });

  it('bumps by gym 2.5 steps', () => {
    expect(bumpTargetRaw('225', 2.5)).toBe('227.5');
    expect(bumpTargetRaw('225', -2.5)).toBe('222.5');
    expect(bumpTargetRaw('0', -2.5)).toBe('0');
  });
});

describe('glasses web app query', () => {
  it('round-trips Load and Convert through the glasses URL', () => {
    const gym = commercialGym();
    const input = {
      view: 'load' as const,
      targetRaw: '225',
      inputUnit: 'lb' as const,
      gymUnit: 'kg' as const,
      bar: 20,
      collars: 0,
      inventory: gym.inventoryKg,
      rounding: 1 as const,
      convertRaw: '225',
      convertFrom: 'lb' as const,
    };
    const url = buildGlassesWebAppUrl(input);
    const parsed = hudFromSearch(new URL(url).search);
    expect(parsed.view).toBe('load');
    expect(parsed.hud.targetLabel).toContain('225');
    expect(parsed.hud.loadedLabel).toContain('KG');
    expect(parsed.hud.convertLb).toContain('225');
    expect(parsed.hud.eachSide.toLowerCase()).toContain('each side');
  });

  it('keeps the Meta AI add link on the origin, not the live query', () => {
    const add = glassesAddDeepLink();
    expect(add.startsWith('fb-viewapp://web_app_deep_link?')).toBe(true);
    expect(add).toContain(encodeURIComponent(GLASSES_WEB_APP_ORIGIN));
    expect(add).not.toContain('view%3D');
    expect(add).not.toContain('t%3D');
  });
});

describe('rest timer', () => {
  it('keeps rest chips to 1:00, 2:00, 3:00', () => {
    expect([...REST_PRESETS]).toEqual([60, 120, 180]);
    expect(DEFAULT_REST_SEC).toBe(60);
    expect(isRestPreset(60)).toBe(true);
    expect(isRestPreset(120)).toBe(true);
    expect(isRestPreset(180)).toBe(true);
    expect(isRestPreset(90)).toBe(false);
    expect(isRestPreset(300)).toBe(false);
  });

  it('formats the clock as m:ss', () => {
    expect(formatRestClock(90)).toBe('1:30');
    expect(formatRestClock(60)).toBe('1:00');
    expect(formatRestClock(5)).toBe('0:05');
    expect(formatRestClock(300)).toBe('5:00');
    expect(formatRestClock(-4)).toBe('0:00');
  });

  it('clamps durations to a sane gym range', () => {
    expect(MIN_REST_SEC).toBe(5);
    expect(MAX_REST_SEC).toBe(1800);
    expect(clampRestDuration(90)).toBe(90);
    expect(clampRestDuration(3)).toBe(MIN_REST_SEC);
    expect(clampRestDuration(9999)).toBe(MAX_REST_SEC);
    expect(clampRestDuration(Number.NaN)).toBe(DEFAULT_REST_SEC);
  });

  it('parses custom rest times', () => {
    expect(parseCustomRest('2:15')).toBe(135);
    expect(parseCustomRest('2.15')).toBe(135);
    expect(parseCustomRest('45s')).toBe(45);
    expect(parseCustomRest('45')).toBe(45);
    expect(parseCustomRest('4:00')).toBe(240);
    expect(parseCustomRest('0:08')).toBe(8);
    expect(parseCustomRest('')).toBeNull();
    expect(parseCustomRest('2:')).toBeNull();
    expect(parseCustomRest('2:75')).toBeNull();
    expect(parseCustomRest('abc')).toBeNull();
  });

  it('clamps a parsed custom time and rejects junk', () => {
    expect(applyCustomRest('2:15')).toBe(135);
    expect(applyCustomRest('45s')).toBe(45);
    expect(applyCustomRest('4:00')).toBe(240);
    expect(applyCustomRest('3')).toBe(MIN_REST_SEC);
    expect(applyCustomRest('9999')).toBe(MAX_REST_SEC);
    expect(applyCustomRest('30:00')).toBe(1800);
    expect(applyCustomRest('')).toBeNull();
    expect(applyCustomRest('2:')).toBeNull();
    expect(applyCustomRest('2:75')).toBeNull();
  });

  it('treats unfinished custom typing as incomplete', () => {
    expect(customRestLooksComplete('2:15')).toBe(true);
    expect(customRestLooksComplete('45')).toBe(true);
    expect(customRestLooksComplete('45s')).toBe(true);
    expect(customRestLooksComplete('4')).toBe(false);
    expect(customRestLooksComplete('2:')).toBe(false);
    expect(customRestLooksComplete('2:1')).toBe(false);
  });

  it('types custom rest on the keypad with dot as a colon', () => {
    expect(appendRestKey('', '2')).toBe('2');
    expect(appendRestKey('2', '.')).toBe('2:');
    expect(appendRestKey('2:', '1')).toBe('2:1');
    expect(appendRestKey('2:1', '5')).toBe('2:15');
    expect(appendRestKey('2:15', '9')).toBe('2:15');
    expect(appendRestKey('2:15', 'back')).toBe('2:1');
    expect(appendRestKey('45', '.')).toBe('45:');
    expect(appendRestKey('0', '4')).toBe('4');
  });

  it('counts down from an end timestamp', () => {
    const now = 1_000_000;
    expect(remainingFromEnd(now + 90_000, now)).toBe(90);
    expect(remainingFromEnd(now + 90_400, now)).toBe(91);
    expect(remainingFromEnd(now - 5_000, now)).toBe(0);
  });

  it('reads the phase from running and remaining', () => {
    expect(restPhase(false, 90, 90)).toBe('idle');
    expect(restPhase(true, 42, 90)).toBe('running');
    expect(restPhase(false, 42, 90)).toBe('paused');
    expect(restPhase(true, 0, 90)).toBe('done');
    expect(restPhase(false, 0, 90)).toBe('done');
  });
});

