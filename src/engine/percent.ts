import { solveLoad, type InventoryCounts, type LoadBias, type LoadSolution } from './solve';
import type { Unit } from './units';

export interface PercentRow {
  percent: number;
  weight: number;
}

export interface LoadablePercentRow extends PercentRow {
  /** What the bar can actually hold at that percent, given the gym's plates. */
  loaded: number;
  solution: LoadSolution;
  exact: boolean;
}

export function percentChart(oneRm: number): PercentRow[] {
  const safe = Math.max(0, oneRm);
  const rows: PercentRow[] = [];
  for (let percent = 50; percent <= 100; percent += 5) {
    rows.push({ percent, weight: safe * (percent / 100) });
  }
  return rows;
}

/**
 * The same chart, but each row also carries the closest weight this gym can
 * actually load. A percentage you cannot put on a bar is not much use.
 */
export function loadablePercentChart(input: {
  oneRm: number;
  bar: number;
  collars: number;
  unit: Unit;
  inventory: InventoryCounts;
  bias?: LoadBias;
}): LoadablePercentRow[] {
  return percentChart(input.oneRm).map((row) => {
    const solution = solveLoad({
      target: row.weight,
      bar: input.bar,
      collars: input.collars,
      unit: input.unit,
      inventory: input.inventory,
      bias: input.bias,
    });
    return {
      ...row,
      loaded: solution.loaded,
      solution,
      exact: Math.abs(solution.loaded - row.weight) < 0.05,
    };
  });
}

export function remainingTo(have: number, want: number): number {
  return want - have;
}
