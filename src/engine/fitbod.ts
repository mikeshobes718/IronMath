import { convertWeight, type Unit } from './units';
import { solveLoad, type InventoryCounts, type LoadSolution } from './solve';

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

export type FitbodLoad = TargetLoad;

export function solveTargetLoad(input: {
  target: number;
  inputUnit: Unit;
  gymUnit: Unit;
  bar: number;
  collars: number;
  inventory: InventoryCounts;
}): TargetLoad {
  const targetGym = convertWeight(input.target, input.inputUnit, input.gymUnit);
  const solution = solveLoad({
    target: targetGym,
    bar: input.bar,
    collars: input.collars,
    unit: input.gymUnit,
    inventory: input.inventory,
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
