import { eachSideCopy } from './breakdown';
import type { CollarId } from './catalog';
import { barWeight, collarWeight } from './catalog';
import { solveLoad, type InventoryCounts, type LoadSolution, type PlateStackItem } from './solve';
import type { Unit } from './units';

export const WARMUP_PERCENTS = [0, 0.4, 0.6, 0.75, 0.85, 1] as const;

export interface SwapHint {
  keep: PlateStackItem[];
  add: PlateStackItem[];
  remove: PlateStackItem[];
  thisSet: string;
  fromLast: string | null;
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

  const thisSet = thisSetCopy(to);
  const fromLast = fromLastCopy(from, add, remove);
  return { keep, add, remove, thisSet, fromLast, copy: thisSet };
}

export function thisSetCopy(plates: PlateStackItem[]): string {
  if (plates.length === 0) {
    return 'Bar only';
  }
  if (plates.length === 1) {
    const item = plates[0];
    const weight = trim(item.weight);
    if (item.count === 1) {
      return `One ${weight} per side`;
    }
    if (item.count === 2) {
      return `Two ${weight}s per side`;
    }
  }
  return eachSideCopy(plates);
}

function fromLastCopy(
  from: PlateStackItem[],
  add: PlateStackItem[],
  remove: PlateStackItem[]
): string | null {
  if (from.length === 0) {
    return null;
  }
  if (add.length === 0 && remove.length === 0) {
    return null;
  }
  const bits: string[] = [];
  if (remove.length) {
    bits.push(`take off ${plainList(remove, 'the')}`);
  }
  if (add.length) {
    bits.push(`put on ${plainList(add, 'a')}`);
  }
  return `From last set: ${bits.join(', ')}.`;
}

function toMap(plates: PlateStackItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of plates) {
    map.set(item.plateId, item.count);
  }
  return map;
}

function plainList(items: PlateStackItem[], singularArticle: 'a' | 'the'): string {
  const parts = items
    .sort((a, b) => b.weight - a.weight)
    .map((item) => {
      const weight = trim(item.weight);
      if (item.count > 1) {
        return `the ${weight}s`;
      }
      return `${singularArticle} ${weight}`;
    });
  if (parts.length <= 2) {
    return parts.join(' and ');
  }
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}
