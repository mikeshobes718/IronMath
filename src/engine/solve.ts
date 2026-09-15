import { plateById, platesForUnit, type PlateSpec } from './catalog';
import { toHundredths, type Unit } from './units';

export interface InventoryCounts {
  [plateId: string]: number;
}

export interface PlateStackItem {
  plateId: string;
  weight: number;
  count: number;
}

/**
 * How the solver breaks a tie it cannot hit exactly.
 * `down` never goes over the target, `up` never comes in under it.
 */
export type LoadBias = 'nearest' | 'down' | 'up';

export interface LoadSolution {
  target: number;
  loaded: number;
  bar: number;
  collars: number;
  perSleeve: number;
  plates: PlateStackItem[];
  exact: boolean;
  delta: number;
  unit: Unit;
}

export function emptySolution(target: number, bar: number, collars: number, unit: Unit): LoadSolution {
  const loaded = bar + collars;
  return {
    target,
    loaded,
    bar,
    collars,
    perSleeve: 0,
    plates: [],
    exact: Math.abs(loaded - target) < 0.001,
    delta: loaded - target,
    unit,
  };
}

export function solveLoad(input: {
  target: number;
  bar: number;
  collars: number;
  unit: Unit;
  inventory: InventoryCounts;
  bias?: LoadBias;
}): LoadSolution {
  const { target, bar, collars, unit, inventory } = input;
  const bias = input.bias ?? 'nearest';
  const available = availablePlates(unit, inventory);
  const sleeveTarget = toHundredths((target - bar - collars) / 2);
  if (sleeveTarget <= 0 || available.length === 0) {
    return emptySolution(target, bar, collars, unit);
  }
  const dp = buildSleeveDp(sleeveTarget, available);
  if (!dp) {
    return emptySolution(target, bar, collars, unit);
  }
  const combo = reconstruct(dp, pickSum(dp, bias));
  return finalize(target, bar, collars, unit, combo);
}

/**
 * The closest loadable totals on either side of the solved load. Lets the
 * Load screen show what you *can* hit when the exact target is off the menu.
 */
export function loadNeighbors(input: {
  target: number;
  bar: number;
  collars: number;
  unit: Unit;
  inventory: InventoryCounts;
  bias?: LoadBias;
}): { lighter: LoadSolution | null; heavier: LoadSolution | null } {
  const { target, bar, collars, unit, inventory } = input;
  const available = availablePlates(unit, inventory);
  const sleeveTarget = toHundredths((target - bar - collars) / 2);
  if (sleeveTarget <= 0 || available.length === 0) {
    return { lighter: null, heavier: null };
  }
  const dp = buildSleeveDp(sleeveTarget, available);
  if (!dp) {
    return { lighter: null, heavier: null };
  }
  const chosen = pickSum(dp, input.bias ?? 'nearest');
  const below = stepReachable(dp, chosen, -1);
  const above = stepReachable(dp, chosen, 1);
  return {
    lighter: below === null ? null : finalize(target, bar, collars, unit, reconstruct(dp, below)),
    heavier: above === null ? null : finalize(target, bar, collars, unit, reconstruct(dp, above)),
  };
}

function availablePlates(unit: Unit, inventory: InventoryCounts): Array<PlateSpec & { pairs: number }> {
  return platesForUnit(unit)
    .map((plate) => ({ ...plate, pairs: Math.max(0, Math.floor(inventory[plate.id] ?? 0)) }))
    .filter((plate) => plate.pairs > 0)
    .sort((a, b) => plateRank(a) - plateRank(b));
}

function plateRank(spec: PlateSpec): number {
  const order =
    spec.unit === 'lb'
      ? [45, 25, 10, 5, 2.5, 35, 55, 1.25, 1, 0.75, 0.5, 0.25]
      : [20, 25, 15, 10, 5, 2.5, 1.25, 1, 0.5, 0.25];
  const index = order.indexOf(spec.weight);
  return index === -1 ? 80 + spec.weight : index;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/**
 * Subset-sum over one sleeve, in steps of the greatest common divisor of the
 * plates on hand. Every reachable sum is a multiple of that step, so working in
 * step units instead of hundredths shrinks the table by 10-100x on a real gym's
 * plate set and keeps every keystroke cheap.
 */
interface SleeveDp {
  can: Uint8Array;
  parent: Int32Array;
  plateAt: Int16Array;
  ids: string[];
  step: number;
  goal: number;
  limit: number;
}

function buildSleeveDp(
  targetHundredths: number,
  plates: Array<PlateSpec & { pairs: number }>
): SleeveDp | null {
  const goal = Math.max(0, Math.round(targetHundredths));
  const ids: string[] = [];
  const unitsById: number[] = [];
  const pairsById: number[] = [];
  for (const plate of plates) {
    const units = toHundredths(plate.weight);
    if (units <= 0) {
      continue;
    }
    ids.push(plate.id);
    unitsById.push(units);
    pairsById.push(plate.pairs);
  }
  if (ids.length === 0) {
    return null;
  }

  const step = unitsById.reduce((acc, units) => gcd(acc, units), unitsById[0]);
  const items: Array<{ index: number; steps: number }> = [];
  let heaviest = 0;
  for (let index = 0; index < ids.length; index += 1) {
    const steps = unitsById[index] / step;
    heaviest = Math.max(heaviest, steps);
    const copies = Math.min(pairsById[index], Math.floor(goal / unitsById[index]) + 1);
    for (let i = 0; i < copies; i += 1) {
      items.push({ index, steps });
    }
  }
  if (items.length === 0) {
    return null;
  }

  const limit = Math.floor(goal / step) + heaviest;
  const can = new Uint8Array(limit + 1);
  const parent = new Int32Array(limit + 1).fill(-1);
  const plateAt = new Int16Array(limit + 1).fill(-1);
  can[0] = 1;

  for (const item of items) {
    for (let sum = limit; sum >= item.steps; sum -= 1) {
      if (can[sum] === 0 && can[sum - item.steps] === 1) {
        can[sum] = 1;
        parent[sum] = sum - item.steps;
        plateAt[sum] = item.index;
      }
    }
  }

  return { can, parent, plateAt, ids, step, goal, limit };
}

function pickSum(dp: SleeveDp, bias: LoadBias): number {
  const { can, step, goal, limit } = dp;
  let best = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let sum = 0; sum <= limit; sum += 1) {
    if (can[sum] === 0) {
      continue;
    }
    const hundredths = sum * step;
    if (bias === 'down' && hundredths > goal) {
      break;
    }
    if (bias === 'up' && hundredths < goal) {
      continue;
    }
    const diff = Math.abs(hundredths - goal);
    // Ties go to the lighter bar: overloading by surprise is worse than
    // coming in a hair under.
    if (diff < bestDiff) {
      best = sum;
      bestDiff = diff;
    }
    if (bias === 'up') {
      break;
    }
  }
  if (bestDiff === Number.POSITIVE_INFINITY) {
    // `up` with nothing heavy enough on the rack: give the heaviest we can.
    return bias === 'up' ? heaviestReachable(dp) : 0;
  }
  return best;
}

function heaviestReachable(dp: SleeveDp): number {
  for (let sum = dp.limit; sum >= 0; sum -= 1) {
    if (dp.can[sum] === 1) {
      return sum;
    }
  }
  return 0;
}

function stepReachable(dp: SleeveDp, from: number, direction: 1 | -1): number | null {
  for (let sum = from + direction; sum >= 0 && sum <= dp.limit; sum += direction) {
    if (dp.can[sum] === 1) {
      return sum;
    }
  }
  return null;
}

function reconstruct(dp: SleeveDp, sum: number): Map<string, number> {
  const counts = new Map<string, number>();
  let current = sum;
  while (current > 0) {
    const index = dp.plateAt[current];
    const prev = dp.parent[current];
    if (index < 0 || prev < 0) {
      break;
    }
    const id = dp.ids[index];
    counts.set(id, (counts.get(id) ?? 0) + 1);
    current = prev;
  }
  return counts;
}

function finalize(
  target: number,
  bar: number,
  collars: number,
  unit: Unit,
  counts: Map<string, number>
): LoadSolution {
  const plates: PlateStackItem[] = [];
  let sleeve = 0;
  const ordered = [...counts.entries()].sort((a, b) => {
    const left = plateById(a[0])?.weight ?? 0;
    const right = plateById(b[0])?.weight ?? 0;
    return right - left;
  });
  for (const [plateId, count] of ordered) {
    if (count <= 0) {
      continue;
    }
    const spec = plateById(plateId);
    if (!spec) {
      continue;
    }
    plates.push({ plateId, weight: spec.weight, count });
    sleeve += spec.weight * count;
  }
  const loaded = bar + collars + sleeve * 2;
  const delta = loaded - target;
  return {
    target,
    loaded,
    bar,
    collars,
    perSleeve: sleeve,
    plates,
    exact: Math.abs(delta) < 0.001,
    delta,
    unit,
  };
}

export function sleeveFromPairs(plateIds: string[]): PlateStackItem[] {
  const counts = new Map<string, number>();
  for (const id of plateIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([plateId, count]) => {
      const spec = plateById(plateId);
      return { plateId, weight: spec?.weight ?? 0, count };
    })
    .sort((a, b) => b.weight - a.weight);
}

export function totalFromSleeve(bar: number, collars: number, plates: PlateStackItem[]): number {
  const sleeve = plates.reduce((sum, item) => sum + item.weight * item.count, 0);
  return bar + collars + sleeve * 2;
}

export function expandPlateIds(plates: PlateStackItem[]): string[] {
  const ids: string[] = [];
  for (const item of plates) {
    for (let i = 0; i < item.count; i += 1) {
      ids.push(item.plateId);
    }
  }
  return ids;
}

export function usedPairs(plates: PlateStackItem[]): InventoryCounts {
  const used: InventoryCounts = {};
  for (const item of plates) {
    used[item.plateId] = item.count;
  }
  return used;
}

export function canAddPair(inventory: InventoryCounts, loaded: PlateStackItem[], plateId: string): boolean {
  const used = usedPairs(loaded)[plateId] ?? 0;
  return used < (inventory[plateId] ?? 0);
}

export function addPair(loaded: PlateStackItem[], plateId: string): PlateStackItem[] {
  const spec = plateById(plateId);
  if (!spec) {
    return loaded;
  }
  const next = loaded.map((item) => ({ ...item }));
  const existing = next.find((item) => item.plateId === plateId);
  if (existing) {
    existing.count += 1;
    return next.sort((a, b) => b.weight - a.weight);
  }
  next.push({ plateId, weight: spec.weight, count: 1 });
  return next.sort((a, b) => b.weight - a.weight);
}

export function removePairAt(loaded: PlateStackItem[], indexInSleeve: number): PlateStackItem[] {
  const ids = expandPlateIds(loaded);
  if (indexInSleeve < 0 || indexInSleeve >= ids.length) {
    return loaded;
  }
  ids.splice(indexInSleeve, 1);
  return sleeveFromPairs(ids);
}

export function removePairById(loaded: PlateStackItem[], plateId: string): PlateStackItem[] {
  return loaded
    .map((item) => (item.plateId === plateId ? { ...item, count: item.count - 1 } : item))
    .filter((item) => item.count > 0);
}
