export type Unit = 'lb' | 'kg';
export type Rounding = 0 | 1 | 2;

export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 2.2046226218;

export function toHundredths(value: number): number {
  return Math.round(value * 100);
}

export function fromHundredths(hundredths: number): number {
  return hundredths / 100;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) {
    return value;
  }
  return from === 'lb' ? lbToKg(value) : kgToLb(value);
}

export function roundGymLoad(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value / 2.5) * 2.5;
}

export function rawForUnitChange(value: number, from: Unit, to: Unit): string {
  const rounded = roundGymLoad(convertWeight(value, from, to));
  return String(Number(rounded.toFixed(2)));
}

export function roundTo(value: number, places: Rounding): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function formatWeight(value: number, unit: Unit, places: Rounding = 1): string {
  const rounded = roundTo(value, places);
  const text = places === 0 ? String(Math.round(rounded)) : rounded.toFixed(places);
  const trimmed = places === 0 ? text : text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return `${trimmed} ${unit === 'lb' ? 'LB' : 'KG'}`;
}

export function formatDual(value: number, unit: Unit, places: Rounding = 1): string {
  const other = convertWeight(value, unit, unit === 'lb' ? 'kg' : 'lb');
  return `${formatWeight(value, unit, places)} | ${formatWeight(other, unit === 'lb' ? 'kg' : 'lb', places)}`;
}

export function parseKeypad(raw: string): number {
  if (!raw || raw === '.' || raw === '-') {
    return 0;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function appendKey(raw: string, key: string, maxLen = 7): string {
  if (key === 'back') {
    return raw.slice(0, -1);
  }
  if (key === 'clear') {
    return '';
  }
  if (key === '.') {
    if (raw.includes('.')) {
      return raw;
    }
    return raw.length === 0 ? '0.' : `${raw}.`;
  }
  if (!/^\d$/.test(key)) {
    return raw;
  }
  if (raw === '0') {
    return key;
  }
  if (raw.length >= maxLen) {
    return raw;
  }
  return `${raw}${key}`;
}
