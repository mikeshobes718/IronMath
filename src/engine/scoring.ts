import { convertWeight, type Unit } from './units';

export type Sex = 'male' | 'female';
export type Equipment = 'classic' | 'equipped';
export type ScoreEvent = 'powerlifting' | 'bench';

interface GlCoeff {
  a: number;
  b: number;
  c: number;
}

const GL: Record<Sex, Record<Equipment, Record<ScoreEvent, GlCoeff>>> = {
  male: {
    classic: {
      powerlifting: { a: 1199.72839, b: 1025.18162, c: 0.00921 },
      bench: { a: 320.98041, b: 281.40258, c: 0.01008 },
    },
    equipped: {
      powerlifting: { a: 1236.25115, b: 1449.21864, c: 0.01644 },
      bench: { a: 381.22073, b: 733.79378, c: 0.02398 },
    },
  },
  female: {
    classic: {
      powerlifting: { a: 610.32796, b: 1045.59282, c: 0.03048 },
      bench: { a: 142.40398, b: 442.52671, c: 0.04724 },
    },
    equipped: {
      powerlifting: { a: 758.63878, b: 949.31382, c: 0.02435 },
      bench: { a: 221.82209, b: 357.00377, c: 0.02937 },
    },
  },
};

const DOTS = {
  male: { a: -0.000001093, b: 0.0007391293, c: -0.1918759221, d: 24.0900756, e: -307.75076 },
  female: { a: -0.0000010706, b: 0.0005158568, c: -0.1126655495, d: 13.6175032, e: -57.96288 },
};

export interface ScoreInput {
  bodyweight: number;
  total: number;
  unit: Unit;
  sex: Sex;
  equipment: Equipment;
  event: ScoreEvent;
}

export interface ScoreResult {
  bodyweightKg: number;
  totalKg: number;
  dots: number;
  gl: number;
}

function toKg(value: number, unit: Unit): number {
  return convertWeight(value, unit, 'kg');
}

export function dotsScore(totalKg: number, bodyweightKg: number, sex: Sex): number {
  const coeff = DOTS[sex];
  const bw = bodyweightKg;
  const denom = coeff.a * bw ** 4 + coeff.b * bw ** 3 + coeff.c * bw ** 2 + coeff.d * bw + coeff.e;
  if (denom === 0) {
    return 0;
  }
  return (totalKg * 500) / denom;
}

export function ipfGlPoints(
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
  equipment: Equipment,
  event: ScoreEvent
): number {
  const { a, b, c } = GL[sex][equipment][event];
  const coeff = a - b * Math.exp(-c * bodyweightKg);
  const roundedCoeff = Number((100 / coeff).toFixed(6));
  return Number((totalKg * roundedCoeff).toFixed(6));
}

export function scoreLifts(input: ScoreInput): ScoreResult {
  const bodyweightKg = toKg(input.bodyweight, input.unit);
  const totalKg = toKg(input.total, input.unit);
  return {
    bodyweightKg,
    totalKg,
    dots: dotsScore(totalKg, bodyweightKg, input.sex),
    gl: ipfGlPoints(totalKg, bodyweightKg, input.sex, input.equipment, input.event),
  };
}
