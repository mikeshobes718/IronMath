import { convertWeight, type Unit } from './units';

export const CLUB_LB = 1000;
export const CLUB_KG = 500;

export function clubTotal(squat: number, bench: number, deadlift: number): number {
  return Math.max(0, squat) + Math.max(0, bench) + Math.max(0, deadlift);
}

export function clubProgress(total: number, unit: Unit) {
  const goal = unit === 'lb' ? CLUB_LB : CLUB_KG;
  const otherUnit: Unit = unit === 'lb' ? 'kg' : 'lb';
  const otherGoal = unit === 'lb' ? CLUB_KG : CLUB_LB;
  const otherTotal = convertWeight(total, unit, otherUnit);
  const otherReached = otherTotal >= otherGoal;
  return {
    total,
    goal,
    remaining: Math.max(0, goal - total),
    ratio: goal > 0 ? Math.min(1, total / goal) : 0,
    reached: total >= goal,
    otherUnit,
    otherTotal,
    otherGoal,
    otherRemaining: Math.max(0, otherGoal - otherTotal),
    otherReached,
  };
}

export function clubOtherCopy(
  otherTotal: number,
  otherUnit: Unit,
  format: (value: number, unit: Unit) => string
): string {
  const otherGoal = otherUnit === 'kg' ? CLUB_KG : CLUB_LB;
  const goalLabel = `${otherGoal} ${otherUnit === 'kg' ? 'KG' : 'LB'}`;
  if (otherTotal >= otherGoal) {
    return `${format(otherTotal, otherUnit)}, past ${goalLabel}.`;
  }
  return `${format(Math.max(0, otherGoal - otherTotal), otherUnit)} to go to ${goalLabel}.`;
}
