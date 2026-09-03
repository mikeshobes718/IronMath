import { convertWeight, roundTo, type Rounding, type Unit } from './units';

export function convertValue(value: number, from: Unit, to: Unit, decimals: Rounding): number {
  return roundTo(convertWeight(value, from, to), decimals);
}
