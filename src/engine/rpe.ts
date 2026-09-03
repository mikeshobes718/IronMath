export const RPE_STEPS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6] as const;
export const RPE_REPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const RPE_TABLE: Record<number, Record<number, number>> = {
  1: { 10: 100, 9.5: 97.8, 9: 95.5, 8.5: 93.9, 8: 92.2, 7.5: 90.7, 7: 89.2, 6.5: 87.8, 6: 86.3 },
  2: { 10: 95.5, 9.5: 93.9, 9: 92.2, 8.5: 90.7, 8: 89.2, 7.5: 87.8, 7: 86.3, 6.5: 84.8, 6: 83.3 },
  3: { 10: 92.2, 9.5: 90.7, 9: 89.2, 8.5: 87.8, 8: 86.3, 7.5: 84.8, 7: 83.3, 6.5: 81.8, 6: 80.4 },
  4: { 10: 89.2, 9.5: 87.8, 9: 86.3, 8.5: 84.8, 8: 83.3, 7.5: 81.8, 7: 80.4, 6.5: 79.0, 6: 77.6 },
  5: { 10: 86.3, 9.5: 84.8, 9: 83.3, 8.5: 81.8, 8: 80.4, 7.5: 79.0, 7: 77.6, 6.5: 76.2, 6: 74.8 },
  6: { 10: 83.7, 9.5: 82.4, 9: 81.1, 8.5: 79.9, 8: 78.6, 7.5: 77.4, 7: 76.2, 6.5: 75.0, 6: 73.8 },
  7: { 10: 81.1, 9.5: 79.9, 9: 78.6, 8.5: 77.4, 8: 76.2, 7.5: 75.0, 7: 73.9, 6.5: 72.3, 6: 70.7 },
  8: { 10: 78.6, 9.5: 77.4, 9: 76.2, 8.5: 75.0, 8: 73.9, 7.5: 72.3, 7: 70.7, 6.5: 69.4, 6: 68.0 },
  9: { 10: 76.2, 9.5: 75.0, 9: 73.9, 8.5: 72.3, 8: 70.7, 7.5: 69.4, 7: 68.0, 6.5: 66.7, 6: 65.3 },
  10: { 10: 73.9, 9.5: 72.3, 9: 70.7, 8.5: 69.4, 8: 68.0, 7.5: 66.7, 7: 65.3, 6.5: 64.0, 6: 62.6 },
  11: { 10: 70.7, 9.5: 69.4, 9: 68.0, 8.5: 66.7, 8: 65.3, 7.5: 64.0, 7: 62.6, 6.5: 61.3, 6: 59.9 },
  12: { 10: 68.0, 9.5: 66.7, 9: 65.3, 8.5: 64.0, 8: 62.6, 7.5: 61.3, 7: 59.9, 6.5: 58.6, 6: 57.4 },
};

export function percentAt(reps: number, rpe: number): number | null {
  const row = RPE_TABLE[reps];
  if (!row) {
    return null;
  }
  return row[rpe] ?? null;
}

export function rirFromRpe(rpe: number): number {
  return Math.max(0, 10 - rpe);
}

export function loadFromRpe(oneRm: number, reps: number, rpe: number): number | null {
  const percent = percentAt(reps, rpe);
  if (percent == null) {
    return null;
  }
  return oneRm * (percent / 100);
}

export function rpeTable(): Array<{ reps: number; values: number[] }> {
  return RPE_REPS.map((reps) => ({
    reps,
    values: RPE_STEPS.map((rpe) => percentAt(reps, rpe) ?? 0),
  }));
}
