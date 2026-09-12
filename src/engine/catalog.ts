import type { Unit } from './units';

export type PlateKind = 'main' | 'change' | 'micro';
export type PlateTheme = 'bumper' | 'iron';
export type CollarId = 'none' | 'clips' | 'competition';

export interface PlateSpec {
  id: string;
  unit: Unit;
  weight: number;
  kind: PlateKind;
}

export interface BarPreset {
  id: string;
  name: string;
  lb: number;
  kg: number;
}

export interface CollarPreset {
  id: CollarId;
  name: string;
  lb: number;
  kg: number;
}

export const BAR_PRESETS: BarPreset[] = [
  { id: 'oly', name: 'Olympic Bar', lb: 45, kg: 20 },
  { id: 'womens', name: "Women's / Multi", lb: 35, kg: 15 },
  { id: 'squat', name: 'Squat Bar', lb: 55, kg: 25 },
  { id: 'ssb', name: 'Safety Squat', lb: 65, kg: 30 },
  { id: 'trap', name: 'Trap / Hex', lb: 45, kg: 20 },
  { id: 'custom', name: 'Custom', lb: 45, kg: 20 },
];

export const COLLARS: CollarPreset[] = [
  { id: 'none', name: 'None', lb: 0, kg: 0 },
  { id: 'clips', name: 'Spring Clips', lb: 0, kg: 0 },
  { id: 'competition', name: 'Competition', lb: 5.5, kg: 2.5 },
];

export const LB_PLATES: PlateSpec[] = [
  { id: 'lb-55', unit: 'lb', weight: 55, kind: 'main' },
  { id: 'lb-45', unit: 'lb', weight: 45, kind: 'main' },
  { id: 'lb-35', unit: 'lb', weight: 35, kind: 'main' },
  { id: 'lb-25', unit: 'lb', weight: 25, kind: 'main' },
  { id: 'lb-10', unit: 'lb', weight: 10, kind: 'main' },
  { id: 'lb-5', unit: 'lb', weight: 5, kind: 'change' },
  { id: 'lb-2.5', unit: 'lb', weight: 2.5, kind: 'change' },
  { id: 'lb-1.25', unit: 'lb', weight: 1.25, kind: 'micro' },
  { id: 'lb-1', unit: 'lb', weight: 1, kind: 'micro' },
  { id: 'lb-0.75', unit: 'lb', weight: 0.75, kind: 'micro' },
  { id: 'lb-0.5', unit: 'lb', weight: 0.5, kind: 'micro' },
  { id: 'lb-0.25', unit: 'lb', weight: 0.25, kind: 'micro' },
];

export const KG_PLATES: PlateSpec[] = [
  { id: 'kg-25', unit: 'kg', weight: 25, kind: 'main' },
  { id: 'kg-20', unit: 'kg', weight: 20, kind: 'main' },
  { id: 'kg-15', unit: 'kg', weight: 15, kind: 'main' },
  { id: 'kg-10', unit: 'kg', weight: 10, kind: 'main' },
  { id: 'kg-5', unit: 'kg', weight: 5, kind: 'change' },
  { id: 'kg-2.5', unit: 'kg', weight: 2.5, kind: 'change' },
  { id: 'kg-1.25', unit: 'kg', weight: 1.25, kind: 'micro' },
  { id: 'kg-1', unit: 'kg', weight: 1, kind: 'micro' },
  { id: 'kg-0.5', unit: 'kg', weight: 0.5, kind: 'micro' },
  { id: 'kg-0.25', unit: 'kg', weight: 0.25, kind: 'micro' },
];

export const ALL_PLATES: PlateSpec[] = [...LB_PLATES, ...KG_PLATES];

export function platesForUnit(unit: Unit): PlateSpec[] {
  return unit === 'lb' ? LB_PLATES : KG_PLATES;
}

export function plateById(id: string): PlateSpec | undefined {
  return ALL_PLATES.find((plate) => plate.id === id);
}

export function barWeight(presetId: string, unit: Unit, customWeight: number): number {
  if (presetId === 'custom') {
    return customWeight;
  }
  const preset = BAR_PRESETS.find((item) => item.id === presetId) ?? BAR_PRESETS[0];
  return unit === 'lb' ? preset.lb : preset.kg;
}

export function collarWeight(collarId: CollarId, unit: Unit): number {
  const collar = COLLARS.find((item) => item.id === collarId) ?? COLLARS[0];
  return unit === 'lb' ? collar.lb : collar.kg;
}

export interface PlateColor {
  fill: string;
  stroke: string;
  text: string;
}

const IRON: PlateColor = { fill: '#3F3F46', stroke: '#71717A', text: '#FAFAFA' };
const LB_PER_KG_APPROX = 2.2046226218;

export function plateColor(spec: PlateSpec, theme: PlateTheme): PlateColor {
  if (theme === 'iron') {
    if (spec.kind === 'micro') {
      return { fill: '#52525B', stroke: '#A1A1AA', text: '#FAFAFA' };
    }
    if (spec.kind === 'change') {
      return { fill: '#D4D4D8', stroke: '#A1A1AA', text: '#18181B' };
    }
    return IRON;
  }

  const lb = spec.unit === 'lb' ? spec.weight : spec.weight * LB_PER_KG_APPROX;
  if (Math.abs(spec.weight - 55) < 0.01 && spec.unit === 'lb') {
    return { fill: '#DC2626', stroke: '#7F1D1D', text: '#FFFFFF' };
  }
  if (spec.unit === 'kg' && spec.weight === 25) {
    return { fill: '#DC2626', stroke: '#7F1D1D', text: '#FFFFFF' };
  }
  if ((spec.unit === 'lb' && spec.weight === 45) || (spec.unit === 'kg' && spec.weight === 20)) {
    return { fill: '#2563EB', stroke: '#1E3A8A', text: '#FFFFFF' };
  }
  if ((spec.unit === 'lb' && spec.weight === 35) || (spec.unit === 'kg' && spec.weight === 15)) {
    return { fill: '#EAB308', stroke: '#854D0E', text: '#18181B' };
  }
  if ((spec.unit === 'lb' && spec.weight === 25) || (spec.unit === 'kg' && spec.weight === 10)) {
    return { fill: '#16A34A', stroke: '#14532D', text: '#FFFFFF' };
  }
  if (spec.unit === 'lb' && spec.weight === 10) {
    return { fill: '#18181B', stroke: '#FAFAFA', text: '#FAFAFA' };
  }
  if (spec.kind === 'change') {
    return { fill: '#E4E4E7', stroke: '#71717A', text: '#18181B' };
  }
  if (lb < 2.5 || spec.kind === 'micro') {
    return { fill: '#A1A1AA', stroke: '#E4E4E7', text: '#18181B' };
  }
  return IRON;
}

export function plateLabelText(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(2)));
}

export function plateLabelMinWidth(weight: number): number {
  const text = plateLabelText(weight);
  if (text.length >= 4) return 34;
  if (text.includes('.')) return 32;
  if (text.length >= 2) return 26;
  return 22;
}

export function plateSize(spec: PlateSpec): { height: number; width: number } {
  const lb = spec.unit === 'lb' ? spec.weight : spec.weight * LB_PER_KG_APPROX;
  let height = 38;
  let width = 34;
  if (lb >= 50) {
    height = 88;
    width = 48;
  } else if (lb >= 40) {
    height = 84;
    width = 46;
  } else if (lb >= 30) {
    height = 76;
    width = 40;
  } else if (lb >= 20) {
    height = 68;
    width = 36;
  } else if (lb >= 8) {
    height = 56;
    width = 32;
  } else if (lb >= 4) {
    height = 48;
    width = 32;
  } else if (lb >= 2) {
    height = 42;
    width = 34;
  }
  return { height, width: Math.max(width, plateLabelMinWidth(spec.weight)) };
}
