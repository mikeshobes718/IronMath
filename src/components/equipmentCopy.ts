import { BAR_PRESETS, COLLARS, type CollarId, type Unit } from '../engine';

const BAR_PLAIN: Record<string, string> = {
  oly: 'Olympic bar',
  womens: 'Lighter bar',
  squat: 'Squat bar',
  ssb: 'Safety squat bar',
  trap: 'Trap bar',
  custom: 'Custom bar',
};

function trimWeight(value: number): string {
  return String(Number(value.toFixed(2)));
}

function unitWord(unit: Unit): string {
  return unit === 'lb' ? 'lb' : 'kg';
}

export function barPickerOptions(unit: Unit, customBar: number) {
  return BAR_PRESETS.map((preset) => {
    const weight = preset.id === 'custom' ? customBar : unit === 'lb' ? preset.lb : preset.kg;
    const name = BAR_PLAIN[preset.id] ?? preset.name;
    return {
      id: preset.id,
      label: `${name}, ${trimWeight(weight)} ${unitWord(unit)}`,
    };
  });
}

export function barPickerValue(barId: string, unit: Unit, customBar: number): string {
  return barPickerOptions(unit, customBar).find((item) => item.id === barId)?.label ?? 'Olympic bar';
}

export function collarPickerOptions(unit: Unit) {
  return COLLARS.map((collar) => {
    if (collar.id === 'none') {
      return { id: collar.id, label: 'None' };
    }
    if (collar.id === 'clips') {
      return { id: collar.id, label: 'Spring clips, no extra weight' };
    }
    const weight = unit === 'lb' ? collar.lb : collar.kg;
    return { id: collar.id, label: `Competition, adds ${trimWeight(weight)} ${unitWord(unit)}` };
  });
}

export function collarPickerValue(collarId: CollarId, unit: Unit): string {
  return collarPickerOptions(unit).find((item) => item.id === collarId)?.label ?? 'None';
}
