import type { PlateStackItem } from './solve';
import { formatWeight, type Unit } from './units';

export function englishBreakdown(
  bar: number,
  collars: number,
  plates: PlateStackItem[],
  loaded: number,
  unit: Unit
): string {
  const barLabel = `${trim(bar)} bar`;
  const pairBits = plates.map((item) => repeatWeight(item.weight, item.count));
  const pairText = pairBits.length > 0 ? `2x(${pairBits.join(' + ')})` : 'empty sleeves';
  const collarText = collars > 0 ? `${trim(collars)} collars` : null;
  const parts = [barLabel, pairText, collarText].filter(Boolean);
  return `${parts.join(' + ')} = ${formatWeight(loaded, unit, 2)}`;
}

function repeatWeight(weight: number, count: number): string {
  const label = trim(weight);
  return Array.from({ length: count }, () => label).join(' + ');
}

function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function missCopy(delta: number, unit: Unit): string | null {
  if (Math.abs(delta) < 0.001) {
    return null;
  }
  const abs = Math.abs(delta);
  const signed = delta > 0 ? `+${trim(abs)}` : `-${trim(abs)}`;
  return `Target missed by ${signed} ${unit === 'lb' ? 'lb' : 'kg'}`;
}
