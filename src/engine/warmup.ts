import type { CollarId } from './catalog';
import { barWeight, collarWeight } from './catalog';
import { solveLoad, type InventoryCounts, type LoadSolution, type PlateStackItem } from './solve';
import type { Unit } from './units';

export const WARMUP_PERCENTS = [0, 0.4, 0.6, 0.75, 0.85, 1] as const;

export interface SwapHint {
  keep: PlateStackItem[];
  add: PlateStackItem[];
  remove: PlateStackItem[];
  copy: string;
}

export interface WarmupSet {
  label: string;
  percent: number;
  target: number;
  solution: LoadSolution;
  swap: SwapHint;
}

export function warmupLadder(input: {
  workingWeight: number;
  barId: string;
  customBar: number;
  collarId: CollarId;
  unit: Unit;
  inventory: InventoryCounts;
}): WarmupSet[] {
  const bar = barWeight(input.barId, input.unit, input.customBar);
  const collars = collarWeight(input.collarId, input.unit);
  const sets: WarmupSet[] = [];
  let previous: PlateStackItem[] = [];

  for (const percent of WARMUP_PERCENTS) {
    const rawTarget = percent === 0 ? bar + collars : input.workingWeight * percent;
    const target = Math.max(bar + collars, rawTarget);
    const solution = solveLoad({
      target,
      bar,
      collars,
      unit: input.unit,
      inventory: input.inventory,
    });
    const swap = minSwap(previous, solution.plates);
    const label = percent === 0 ? 'Bar' : `${Math.round(percent * 100)}%`;
    sets.push({ label, percent, target, solution, swap });
    previous = solution.plates;
  }
  return sets;
}

export function minSwap(from: PlateStackItem[], to: PlateStackItem[]): SwapHint {
  const fromMap = toMap(from);
  const toMapCounts = toMap(to);
  const ids = new Set([...fromMap.keys(), ...toMapCounts.keys()]);
  const keep: PlateStackItem[] = [];
  const add: PlateStackItem[] = [];
  const remove: PlateStackItem[] = [];

  for (const id of ids) {
    const before = fromMap.get(id) ?? 0;
    const after = toMapCounts.get(id) ?? 0;
    const shared = Math.min(before, after);
    const extra = after - shared;
    const stripped = before - shared;
    const weight = (to.find((item) => item.plateId === id) ?? from.find((item) => item.plateId === id))?.weight ?? 0;
    if (shared > 0) {
      keep.push({ plateId: id, weight, count: shared });
    }
    if (extra > 0) {
      add.push({ plateId: id, weight, count: extra });
    }
    if (stripped > 0) {
      remove.push({ plateId: id, weight, count: stripped });
    }
  }

  return { keep, add, remove, copy: swapCopy(keep, add, remove) };
}

function toMap(plates: PlateStackItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of plates) {
    map.set(item.plateId, item.count);
  }
  return map;
}

function swapCopy(keep: PlateStackItem[], add: PlateStackItem[], remove: PlateStackItem[]): string {
  if (keep.length === 0 && add.length === 0 && remove.length === 0) {
    return 'Bar only. No plates.';
  }
  const bits: string[] = [];
  if (keep.length) {
    bits.push(`Keep ${list(keep)}`);
  }
  if (remove.length) {
    bits.push(`strip ${list(remove)}`);
  }
  if (add.length) {
    bits.push(`add ${list(add)}`);
  }
  return `${bits.join(', ')}.`;
}

function list(items: PlateStackItem[]): string {
  return items
    .sort((a, b) => b.weight - a.weight)
    .map((item) => (item.count > 1 ? `${item.count}x${trim(item.weight)}` : `${trim(item.weight)}`))
    .join(' + ');
}

function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}
