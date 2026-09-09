export function percentChart(oneRm: number): Array<{ percent: number; weight: number }> {
  const safe = Math.max(0, oneRm);
  const rows: Array<{ percent: number; weight: number }> = [];
  for (let percent = 50; percent <= 100; percent += 5) {
    rows.push({ percent, weight: safe * (percent / 100) });
  }
  return rows;
}

export function remainingTo(have: number, want: number): number {
  return want - have;
}
