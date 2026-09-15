export interface OneRepMax {
  weight: number;
  reps: number;
  brzycki: number;
  epley: number;
  average: number;
}

export function estimateOneRm(weight: number, reps: number): OneRepMax {
  const safeReps = Math.max(1, Math.min(36, Math.round(reps)));
  const safeWeight = Math.max(0, weight);
  if (safeReps === 1) {
    return {
      weight: safeWeight,
      reps: 1,
      brzycki: safeWeight,
      epley: safeWeight,
      average: safeWeight,
    };
  }
  const brzycki = safeWeight * (36 / (37 - safeReps));
  const epley = safeWeight * (1 + safeReps / 30);
  return {
    weight: safeWeight,
    reps: safeReps,
    brzycki,
    epley,
    average: (brzycki + epley) / 2,
  };
}

/**
 * What the same max predicts for other rep counts. Reads back off the Epley and
 * Brzycki pair the estimate came from, so the table and the estimate agree.
 */
export function repMaxTable(oneRm: number, maxReps = 10): Array<{ reps: number; weight: number }> {
  const safe = Math.max(0, oneRm);
  const rows: Array<{ reps: number; weight: number }> = [];
  for (let reps = 1; reps <= maxReps; reps += 1) {
    rows.push({ reps, weight: safe * repMaxFactor(reps) });
  }
  return rows;
}

export function repMaxFactor(reps: number): number {
  const safeReps = Math.max(1, Math.min(36, Math.round(reps)));
  if (safeReps === 1) {
    return 1;
  }
  const brzycki = (37 - safeReps) / 36;
  const epley = 1 / (1 + safeReps / 30);
  return (brzycki + epley) / 2;
}
