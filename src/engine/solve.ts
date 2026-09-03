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
}): LoadSolution {
  const { target, bar, collars, unit, inventory } = input;
  const available = availablePlates(unit, inventory);
  const sleeveTarget = toHundredths((target - bar - collars) / 2);
  if (sleeveTarget <= 0 || available.length === 0) {
    return emptySolution(target, bar, collars, unit);
  }
  const combo = closestSleeve(sleeveTarget, available);
  return finalize(target, bar, collars, unit, combo);
}

function availablePlates(unit: Unit, inventory: InventoryCounts): Array<PlateSpec & { pairs: number }> {
  return platesForUnit(unit)
    .map((plate) => ({ ...plate, pairs: Math.max(0, Math.floor(inventory[plate.id] ?? 0)) }))
    .filter((plate) => plate.pairs > 0)
    .sort((a, b) => b.weight - a.weight);
}

function closestSleeve(
  targetHundredths: number,
  plates: Array<PlateSpec & { pairs: number }>
): Map<string, number> {
  const goal = Math.max(0, Math.round(targetHundredths));
  const items: Array<{ id: string; units: number }> = [];
  for (const plate of plates) {
    const units = toHundredths(plate.weight);
    if (units <= 0) {
      continue;
    }
    const max = Math.min(plate.pairs, Math.floor(goal / units) + 1);
    for (let i = 0; i < max; i += 1) {
      items.push({ id: plate.id, units });
    }
  }

  if (items.length === 0) {
    return new Map();
  }

  const heaviest = items[0].units;
  const limit = goal + heaviest;
  const can = new Uint8Array(limit + 1);
  const parent = new Int32Array(limit + 1);
  const plateAt: Array<string | null> = Array.from({ length: limit + 1 }, () => null);
  can[0] = 1;
  parent.fill(-1);

  for (const item of items) {
    for (let sum = limit; sum >= item.units; sum -= 1) {
      if (can[sum] === 0 && can[sum - item.units] === 1) {
        can[sum] = 1;
        parent[sum] = sum - item.units;
        plateAt[sum] = item.id;
      }
    }
  }

  let best = 0;
  let bestDiff = goal;
  for (let sum = 0; sum <= limit; sum += 1) {
    if (can[sum] === 0) {
      continue;
    }
    const diff = Math.abs(sum - goal);
    if (diff < bestDiff || (diff === bestDiff && sum <= goal && best > goal)) {
      best = sum;
      bestDiff = diff;
    }
  }

  return reconstruct(best, parent, plateAt);
}

function reconstruct(
  sum: number,
  parent: Int32Array,
  plateAt: Array<string | null>
): Map<string, number> {
  const counts = new Map<string, number>();
  let current = sum;
  while (current > 0) {
    const id = plateAt[current];
    const prev = parent[current];
    if (!id || prev < 0) {
      break;
    }
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
