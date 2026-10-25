import { IExerciseType, IHistoryRecord, IMeetLift, IMeetLiftGoal, IMeetProfile, IWeight } from "../types";
import { Weight_convertTo, Weight_getOneRepMax } from "./weight";

export const MeetProfile_exerciseTypes: Record<IMeetLift, IExerciseType> = {
  squat: { id: "squat", equipment: "barbell" },
  bench: { id: "benchPress", equipment: "barbell" },
  deadlift: { id: "deadlift", equipment: "barbell" },
};

export const MeetProfile_liftNames: Record<IMeetLift, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
};

// Lyteweight's owner: USAPL raw, last meet at 75kg, cutting to 67.5kg for the February 20, 2027 meet.
export const MeetProfile_seed: IMeetProfile = {
  federation: "USAPL",
  division: "Raw",
  sex: "male",
  meetDate: "2027-02-20",
  weightClassKg: 67.5,
  bodyweightKg: 70,
  lifts: {
    squat: { bestKg: 132.5, targetKg: 145 },
    bench: { bestKg: 82.5, targetKg: 100 },
    deadlift: { bestKg: 145, targetKg: 160 },
  },
};

const dayMs = 24 * 60 * 60 * 1000;
// RPE-table estimates get unreliable past 10 reps, so higher-rep sets don't count toward e1RM.
const maxRepsForE1rm = 10;

export function MeetProfile_parseKg(text: string | undefined): number | undefined {
  const value = Number((text ?? "").trim());
  return (text ?? "").trim() !== "" && isFinite(value) && value > 0 ? value : undefined;
}

export function MeetProfile_parseDate(text: string | undefined): string | undefined {
  const match = (text ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? match[0] : undefined;
}

export function MeetProfile_withLiftGoal(
  profile: IMeetProfile,
  lift: IMeetLift,
  patch: Partial<IMeetLiftGoal>
): IMeetProfile {
  return { ...profile, lifts: { ...profile.lifts, [lift]: { ...profile.lifts[lift], ...patch } } };
}

export function MeetProfile_formatKg(kg: number | undefined): string {
  return kg == null ? "-" : `${Math.round(kg * 10) / 10} kg`;
}

export function MeetProfile_get(profile: IMeetProfile | undefined): IMeetProfile {
  return profile ?? MeetProfile_seed;
}

export function MeetProfile_daysUntilMeet(profile: IMeetProfile, now: number): number {
  const [year, month, day] = profile.meetDate.split("-").map(Number);
  const meet = new Date(year, month - 1, day).getTime();
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((meet - startOfToday) / dayMs);
}

export function MeetProfile_recentE1rmKg(
  history: IHistoryRecord[],
  lift: IMeetLift,
  now: number,
  windowDays: number = 42
): number | undefined {
  const exerciseId = MeetProfile_exerciseTypes[lift].id;
  const since = now - windowDays * dayMs;
  let best: number | undefined;
  for (const record of history) {
    if ((record.startTime ?? 0) < since) {
      continue;
    }
    for (const entry of record.entries) {
      if (entry.exercise.id !== exerciseId) {
        continue;
      }
      for (const set of entry.sets) {
        const reps = set.completedReps ?? 0;
        const weight = set.completedWeight ?? set.weight;
        if (!set.isCompleted || reps < 1 || reps > maxRepsForE1rm || weight == null) {
          continue;
        }
        const e1rm = Weight_convertTo(Weight_getOneRepMax(weight, reps, set.completedRpe), "kg").value;
        best = best == null ? e1rm : Math.max(best, e1rm);
      }
    }
  }
  return best;
}

export function MeetProfile_planningMaxKg(profile: IMeetProfile, lift: IMeetLift, recentE1rmKg?: number): number {
  const goal = profile.lifts[lift];
  return goal.planningMaxKg ?? Math.max(goal.bestKg, recentE1rmKg ?? 0);
}

export function MeetProfile_bodyweightKg(profile: IMeetProfile, loggedBodyweight?: IWeight): number | undefined {
  if (loggedBodyweight != null && loggedBodyweight.value > 0) {
    return Weight_convertTo(loggedBodyweight, "kg").value;
  }
  return profile.bodyweightKg;
}
