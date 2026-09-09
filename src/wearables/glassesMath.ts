import {
  formatWeight,
  parseKeypad,
  solveLoad,
  WARMUP_PERCENTS,
  type GlanceHud,
  type GlanceInput,
} from '../engine';
import {
  hudFromSearch as baseHudFromSearch,
  parseGlassesSearch,
  type GlassesView,
} from './glassesQuery';

export type GlassesHud = GlanceHud & { warmup: string };

export function warmupLine(input: GlanceInput): string {
  const working = parseKeypad(input.targetRaw);
  if (working <= 0) {
    return '';
  }
  const parts: string[] = [];
  for (const percent of WARMUP_PERCENTS) {
    const rawTarget = percent === 0 ? input.bar + input.collars : working * percent;
    const target = Math.max(input.bar + input.collars, rawTarget);
    const solution = solveLoad({
      target,
      bar: input.bar,
      collars: input.collars,
      unit: input.gymUnit,
      inventory: input.inventory,
    });
    const label = formatWeight(solution.loaded, input.gymUnit, 0).replace(/ (LB|KG)$/, '');
    if (parts[parts.length - 1] !== label) {
      parts.push(label);
    }
  }
  return parts.join(' / ');
}

export function hudFromSearch(search: string): { hud: GlassesHud; view: GlassesView } {
  const input = parseGlassesSearch(search);
  const base = baseHudFromSearch(search);
  return { hud: { ...base.hud, warmup: warmupLine(input) }, view: base.view };
}

export { parseGlassesSearch };
