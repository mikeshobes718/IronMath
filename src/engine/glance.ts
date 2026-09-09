import { eachSideCopy } from './breakdown';
import { missInputCopy, solveTargetLoad } from './fitbod';
import type { PlateStackItem, InventoryCounts } from './solve';
import { convertWeight, formatWeight, parseKeypad, roundGymLoad, type Rounding, type Unit } from './units';

export const GYM_STEP = 2.5;

export type GlanceInput = {
  targetRaw: string;
  inputUnit: Unit;
  gymUnit: Unit;
  bar: number;
  collars: number;
  inventory: InventoryCounts;
  rounding: Rounding;
  convertRaw: string;
  convertFrom: Unit;
};

export type GlanceHud = {
  targetRaw: string;
  inputUnit: Unit;
  targetLabel: string;
  loadedLabel: string;
  otherLoadedLabel: string;
  eachSide: string;
  miss: string;
  exact: boolean;
  convertLb: string;
  convertKg: string;
  plates: PlateStackItem[];
  lockTitle: string;
  lockSubtitle: string;
  islandTitle: string;
  islandSubtitle: string;
  bumpStep: string;
};

export function bumpTargetRaw(raw: string, delta: number): string {
  const value = parseKeypad(raw);
  const next = Math.max(0, roundGymLoad(value + delta));
  return String(Number(next.toFixed(2)));
}

export function buildGlanceHud(input: GlanceInput): GlanceHud {
  const target = parseKeypad(input.targetRaw);
  const result = solveTargetLoad({
    target,
    inputUnit: input.inputUnit,
    gymUnit: input.gymUnit,
    bar: input.bar,
    collars: input.collars,
    inventory: input.inventory,
  });
  const otherUnit: Unit = input.gymUnit === 'kg' ? 'lb' : 'kg';
  const otherLoaded = input.gymUnit === 'kg' ? result.loadedLb : result.loadedKg;
  const loadedLabel = formatWeight(result.solution.loaded, input.gymUnit, input.rounding);
  const otherLoadedLabel = formatWeight(otherLoaded, otherUnit, input.rounding);
  const eachSide = eachSideCopy(result.solution.plates);
  const miss = missInputCopy(result.deltaInput, input.inputUnit);
  const convertValue = parseKeypad(input.convertRaw);
  const convertLb = formatWeight(convertWeight(convertValue, input.convertFrom, 'lb'), 'lb', input.rounding);
  const convertKg = formatWeight(convertWeight(convertValue, input.convertFrom, 'kg'), 'kg', input.rounding);
  const targetLabel = formatWeight(target, input.inputUnit, input.rounding);
  const islandPlates = eachSide.startsWith('Each side: ') ? eachSide.slice('Each side: '.length) : eachSide;
  return {
    targetRaw: input.targetRaw,
    inputUnit: input.inputUnit,
    targetLabel,
    loadedLabel,
    otherLoadedLabel,
    eachSide,
    miss,
    exact: result.solution.exact,
    convertLb,
    convertKg,
    plates: result.solution.plates,
    lockTitle: loadedLabel,
    lockSubtitle: `${eachSide}. ${convertLb} / ${convertKg}`,
    islandTitle: loadedLabel,
    islandSubtitle: islandPlates,
    bumpStep: String(GYM_STEP),
  };
}
