import { KG_PLATES, LB_PLATES, type CollarId } from './catalog';
import type { InventoryCounts } from './solve';

export type GymKind = 'commercial' | 'garage' | 'powerlifting' | 'custom';

export interface GymProfile {
  id: string;
  name: string;
  kind: GymKind;
  inventoryLb: InventoryCounts;
  inventoryKg: InventoryCounts;
  collarId: CollarId;
}

function fill(ids: string[], values: Record<string, number>, fallback: number): InventoryCounts {
  const counts: InventoryCounts = {};
  for (const id of ids) {
    counts[id] = values[id] ?? fallback;
  }
  return counts;
}

const LB_IDS = LB_PLATES.map((plate) => plate.id);
const KG_IDS = KG_PLATES.map((plate) => plate.id);

export function commercialGym(): GymProfile {
  return {
    id: 'commercial',
    name: 'Commercial Gym',
    kind: 'commercial',
    collarId: 'clips',
    inventoryLb: fill(LB_IDS, {
      'lb-55': 2,
      'lb-45': 99,
      'lb-35': 2,
      'lb-25': 2,
      'lb-10': 4,
      'lb-5': 2,
      'lb-2.5': 2,
      'lb-1.25': 0,
      'lb-1': 0,
      'lb-0.75': 0,
      'lb-0.5': 0,
      'lb-0.25': 0,
    }, 0),
    inventoryKg: fill(KG_IDS, {
      'kg-25': 99,
      'kg-20': 4,
      'kg-15': 2,
      'kg-10': 2,
      'kg-5': 2,
      'kg-2.5': 2,
      'kg-1.25': 1,
      'kg-1': 0,
      'kg-0.5': 0,
      'kg-0.25': 0,
    }, 0),
  };
}

export function garageGym(): GymProfile {
  return {
    id: 'garage',
    name: 'Garage / Home Gym',
    kind: 'garage',
    collarId: 'clips',
    inventoryLb: fill(LB_IDS, {
      'lb-55': 0,
      'lb-45': 4,
      'lb-35': 1,
      'lb-25': 1,
      'lb-10': 2,
      'lb-5': 2,
      'lb-2.5': 2,
      'lb-1.25': 1,
      'lb-1': 0,
      'lb-0.75': 0,
      'lb-0.5': 1,
      'lb-0.25': 1,
    }, 0),
    inventoryKg: fill(KG_IDS, {
      'kg-25': 2,
      'kg-20': 4,
      'kg-15': 1,
      'kg-10': 1,
      'kg-5': 2,
      'kg-2.5': 2,
      'kg-1.25': 1,
      'kg-1': 0,
      'kg-0.5': 1,
      'kg-0.25': 1,
    }, 0),
  };
}

export function powerliftingGym(): GymProfile {
  return {
    id: 'powerlifting',
    name: 'Powerlifting Gym',
    kind: 'powerlifting',
    collarId: 'competition',
    inventoryLb: fill(LB_IDS, {
      'lb-55': 1,
      'lb-45': 8,
      'lb-35': 1,
      'lb-25': 1,
      'lb-10': 2,
      'lb-5': 2,
      'lb-2.5': 2,
      'lb-1.25': 2,
      'lb-1': 0,
      'lb-0.75': 0,
      'lb-0.5': 2,
      'lb-0.25': 2,
    }, 0),
    inventoryKg: fill(KG_IDS, {
      'kg-25': 8,
      'kg-20': 2,
      'kg-15': 1,
      'kg-10': 1,
      'kg-5': 2,
      'kg-2.5': 2,
      'kg-1.25': 2,
      'kg-1': 0,
      'kg-0.5': 2,
      'kg-0.25': 2,
    }, 0),
  };
}

export function defaultGyms(): GymProfile[] {
  return [commercialGym(), garageGym(), powerliftingGym()];
}
