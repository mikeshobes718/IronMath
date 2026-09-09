import type { Unit } from './units';

export type LiftId = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row';

export interface LiftMeta {
  id: LiftId;
  title: string;
  detail: string;
}

export const LIFT_LIST: LiftMeta[] = [
  { id: 'squat', title: 'Squat', detail: 'Plates, warm-up, 1RM, and RPE.' },
  { id: 'bench', title: 'Bench', detail: 'Plates, warm-up, 1RM, and RPE.' },
  { id: 'deadlift', title: 'Deadlift', detail: 'Plates, warm-up, 1RM, and RPE.' },
  { id: 'ohp', title: 'Overhead Press', detail: 'Plates, warm-up, 1RM, and RPE.' },
  { id: 'row', title: 'Barbell Row', detail: 'Plates, warm-up, 1RM, and RPE.' },
];

export const DEFAULT_LIFT_WORKING: Record<LiftId, { lb: string; kg: string }> = {
  squat: { lb: '315', kg: '140' },
  bench: { lb: '225', kg: '100' },
  deadlift: { lb: '405', kg: '180' },
  ohp: { lb: '135', kg: '60' },
  row: { lb: '185', kg: '85' },
};

export function isLiftId(value: string | undefined): value is LiftId {
  return LIFT_LIST.some((item) => item.id === value);
}

export function liftTitle(id: LiftId): string {
  return LIFT_LIST.find((item) => item.id === id)?.title ?? 'Lift';
}

export function defaultWorking(id: LiftId, unit: Unit): string {
  return unit === 'lb' ? DEFAULT_LIFT_WORKING[id].lb : DEFAULT_LIFT_WORKING[id].kg;
}
