import { convertWeight, type Unit } from './units';
import { loadNeighbors, solveLoad, type InventoryCounts, type LoadBias, type LoadSolution } from './solve';

export interface TargetLoad {
  target: number;
  inputUnit: Unit;
  targetGym: number;
  gymUnit: Unit;
  solution: LoadSolution;
  loadedLb: number;
  loadedKg: number;
  deltaInput: number;
}

export interface LoadNeighbor {
  /** Loadable total, in the gym's unit. */
  loaded: number;
  /** The same total expressed in whatever unit the lifter typed. */
  inInputUnit: number;
  delta: number;
}

export type FitbodLoad = TargetLoad;

export function solveTargetLoad(input: {
  target: number;
  inputUnit: Unit;
  gymUnit: Unit;
  bar: number;
  collars: number;
  inventory: InventoryCounts;
  bias?: LoadBias;
}): TargetLoad {
  const targetGym = convertWeight(input.target, input.inputUnit, input.gymUnit);
  const solution = solveLoad({
    target: targetGym,
    bar: input.bar,
    collars: input.collars,
    unit: input.gymUnit,
    inventory: input.inventory,
    bias: input.bias,
  });
  const loadedLb = convertWeight(solution.loaded, input.gymUnit, 'lb');
  const loadedKg = convertWeight(solution.loaded, input.gymUnit, 'kg');
  const loadedInput = convertWeight(solution.loaded, input.gymUnit, input.inputUnit);
  return {
    target: input.target,
    inputUnit: input.inputUnit,
    targetGym,
    gymUnit: input.gymUnit,
    solution,
    loadedLb,
    loadedKg,
    deltaInput: loadedInput - input.target,
  };
}

/**
 * The nearest loadable totals either side of the solved one, already converted
 * back into the unit the lifter typed so the Load screen can offer them as taps.
 */
export function targetLoadNeighbors(input: {
  target: number;
  inputUnit: Unit;
  gymUnit: Unit;
  bar: number;
  collars: number;
  inventory: InventoryCounts;
  bias?: LoadBias;
}): { lighter: LoadNeighbor | null; heavier: LoadNeighbor | null } {
  const targetGym = convertWeight(input.target, input.inputUnit, input.gymUnit);
  const { lighter, heavier } = loadNeighbors({
    target: targetGym,
    bar: input.bar,
    collars: input.collars,
    unit: input.gymUnit,
    inventory: input.inventory,
    bias: input.bias,
  });
  const shape = (solution: LoadSolution | null): LoadNeighbor | null => {
    if (!solution) {
      return null;
    }
    const inInputUnit = convertWeight(solution.loaded, input.gymUnit, input.inputUnit);
    return { loaded: solution.loaded, inInputUnit, delta: inInputUnit - input.target };
  };
  return { lighter: shape(lighter), heavier: shape(heavier) };
}

export function solveFitbodLoad(input: {
  targetLb: number;
  gymUnit: Unit;
  bar: number;
  collars: number;
  inventory: InventoryCounts;
}): TargetLoad {
  return solveTargetLoad({
    target: input.targetLb,
    inputUnit: 'lb',
    gymUnit: input.gymUnit,
    bar: input.bar,
    collars: input.collars,
    inventory: input.inventory,
  });
}

export function missInputCopy(delta: number, unit: Unit): string {
  if (Math.abs(delta) < 0.05) {
    return 'Exact';
  }
  const abs = Math.abs(delta);
  const text = String(Number(abs.toFixed(1)));
  const label = unit === 'kg' ? 'kg' : 'lb';
  return delta < 0 ? `${text} ${label} light` : `${text} ${label} heavy`;
}

export function missLbCopy(deltaLb: number): string {
  return missInputCopy(deltaLb, 'lb');
}
