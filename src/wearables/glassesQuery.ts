import {
  buildGlanceHud,
  commercialGym,
  type GlanceHud,
  type GlanceInput,
  type InventoryCounts,
  type Rounding,
  type Unit,
} from '../engine';

export const GLASSES_WEB_APP_NAME = 'IronMath';
export const GLASSES_WEB_APP_ORIGIN = 'https://ironmath-glasses.vercel.app';

export type GlassesView = 'load' | 'convert';

export type GlassesQueryInput = GlanceInput & { view: GlassesView };

function isUnit(value: string | null): value is Unit {
  return value === 'lb' || value === 'kg';
}

export function encodeGymInventory(inventory: InventoryCounts): string {
  return Object.entries(inventory)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([id, count]) => `${id}:${count}`)
    .join(',');
}

export function decodeGymInventory(raw: string): InventoryCounts {
  const counts: InventoryCounts = {};
  if (!raw) {
    return counts;
  }
  for (const part of raw.split(',')) {
    const cut = part.lastIndexOf(':');
    if (cut <= 0) {
      continue;
    }
    const id = part.slice(0, cut);
    const count = Number(part.slice(cut + 1));
    if (id && Number.isFinite(count) && count > 0) {
      counts[id] = count;
    }
  }
  return counts;
}

export function buildGlassesWebAppUrl(input: GlassesQueryInput): string {
  const params = new URLSearchParams();
  params.set('view', input.view);
  params.set('t', input.targetRaw);
  params.set('iu', input.inputUnit);
  params.set('gu', input.gymUnit);
  params.set('bar', String(input.bar));
  params.set('col', String(input.collars));
  params.set('r', String(input.rounding));
  params.set('c', input.convertRaw);
  params.set('cf', input.convertFrom);
  const inv = encodeGymInventory(input.inventory);
  if (inv) {
    params.set('inv', inv);
  }
  return `${GLASSES_WEB_APP_ORIGIN}/?${params.toString()}`;
}

export const GLASSES_HUD_API = `${GLASSES_WEB_APP_ORIGIN}/api/hud`;

export function glassesAddDeepLink(): string {
  return `fb-viewapp://web_app_deep_link?appName=${encodeURIComponent(GLASSES_WEB_APP_NAME)}&appUrl=${encodeURIComponent(GLASSES_WEB_APP_ORIGIN)}`;
}

export function searchFromGlassesUrl(pageUrl: string): string {
  try {
    return new URL(pageUrl).search;
  } catch {
    return '';
  }
}

export function parseGlassesSearch(search: string): GlassesQueryInput {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const gymParam = params.get('gu');
  const inputParam = params.get('iu');
  const convertParam = params.get('cf');
  const gymUnit: Unit = isUnit(gymParam) ? gymParam : 'kg';
  const decoded = decodeGymInventory(params.get('inv') ?? '');
  const gym = commercialGym();
  const fallback = gymUnit === 'lb' ? gym.inventoryLb : gym.inventoryKg;
  const roundingRaw = Number(params.get('r') ?? '1');
  const rounding: Rounding = roundingRaw === 0 || roundingRaw === 2 ? roundingRaw : 1;
  return {
    view: params.get('view') === 'convert' ? 'convert' : 'load',
    targetRaw: params.get('t') ?? '',
    inputUnit: isUnit(inputParam) ? inputParam : 'lb',
    gymUnit,
    bar: Number(params.get('bar') ?? (gymUnit === 'lb' ? 45 : 20)),
    collars: Number(params.get('col') ?? 0),
    inventory: Object.keys(decoded).length > 0 ? decoded : fallback,
    rounding,
    convertRaw: params.get('c') ?? '',
    convertFrom: isUnit(convertParam) ? convertParam : 'lb',
  };
}

export function hudFromSearch(search: string): { hud: GlanceHud; view: GlassesView } {
  const input = parseGlassesSearch(search);
  return { hud: buildGlanceHud(input), view: input.view };
}
