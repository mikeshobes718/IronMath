export interface AttemptPlan {
  opener: number;
  second: number;
  third: number;
  openerRange: [number, number];
  secondRange: [number, number];
  thirdRange: [number, number];
}

export function planAttempts(thirdTarget: number): AttemptPlan {
  const goal = Math.max(0, thirdTarget);
  return {
    opener: goal * 0.91,
    second: goal * 0.97,
    third: goal * 1.01,
    openerRange: [goal * 0.9, goal * 0.92],
    secondRange: [goal * 0.96, goal * 0.98],
    thirdRange: [goal * 1.0, goal * 1.02],
  };
}
