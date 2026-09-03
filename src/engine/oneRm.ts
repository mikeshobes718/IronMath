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
