export interface IMeetAttempts {
  opener: number;
  second: number;
  third: number;
}

// USAPL attempts must be multiples of 2.5kg (record attempts excepted).
const attemptStepKg = 2.5;
const openerPct = 0.91;
const secondPct = 0.96;
const thirdPct = 1.01;

// 20kg competition bar plus two 2.5kg collars.
export const MeetAttempts_barWithCollarsKg = 25;
const competitionPlatesKg = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25];

function roundDown(kg: number): number {
  return Math.floor(kg / attemptStepKg + 1e-9) * attemptStepKg;
}

function roundNearest(kg: number): number {
  return Math.round(kg / attemptStepKg) * attemptStepKg;
}

export function MeetAttempts_plan(planningMaxKg: number): IMeetAttempts {
  const opener = roundDown(planningMaxKg * openerPct);
  const second = Math.max(roundNearest(planningMaxKg * secondPct), opener + attemptStepKg);
  const third = Math.max(roundNearest(planningMaxKg * thirdPct), second + attemptStepKg);
  return { opener, second, third };
}

export function MeetAttempts_formatPlates(plates: number[] | undefined): string {
  if (plates == null) {
    return "not loadable";
  }
  return plates.length === 0 ? "bar + collars" : plates.join(" / ");
}

/** Plates for one side of the competition bar, heaviest first, or undefined if the weight can't be loaded. */
export function MeetAttempts_platesPerSide(totalKg: number): number[] | undefined {
  let remaining = (totalKg - MeetAttempts_barWithCollarsKg) / 2;
  if (remaining < 0) {
    return undefined;
  }
  const plates: number[] = [];
  for (const plate of competitionPlatesKg) {
    while (remaining >= plate - 1e-9) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return Math.abs(remaining) < 1e-9 ? plates : undefined;
}
