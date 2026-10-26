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

const dayMs = 24 * 60 * 60 * 1000;
// Lyteweight Meet Prep is 17 weeks long, so a new profile assumes a meet that far out.
const defaultWeeksOut = 17;
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

/** A profile with nothing filled in yet: 0 means "not set" for weights and the weight class. */
export function MeetProfile_empty(now: number): IMeetProfile {
  const meet = new Date(now + defaultWeeksOut * 7 * dayMs);
  const pad = (n: number): string => `${n}`.padStart(2, "0");
  return {
    federation: "",
    division: "Raw",
    sex: "male",
    meetDate: `${meet.getFullYear()}-${pad(meet.getMonth() + 1)}-${pad(meet.getDate())}`,
    weightClassKg: 0,
    lifts: {
      squat: { bestKg: 0, targetKg: 0 },
      bench: { bestKg: 0, targetKg: 0 },
      deadlift: { bestKg: 0, targetKg: 0 },
    },
  };
}

export function MeetProfile_get(profile: IMeetProfile | undefined, now: number): IMeetProfile {
  return profile ?? MeetProfile_empty(now);
}

/** Text for an editable kg field: blank instead of 0, so an unset value reads as empty. */
export function MeetProfile_kgInput(kg: number | undefined): string {
  return kg != null && kg > 0 ? `${kg}` : "";
}

export function MeetProfile_headline(profile: IMeetProfile, daysUntilMeet: number): string {
  const parts = [
    [profile.federation, profile.division].filter((p) => p).join(" "),
    profile.weightClassKg > 0 ? `${profile.weightClassKg} kg class` : "",
    daysUntilMeet >= 0 ? `${daysUntilMeet} days to the meet` : "Meet date has passed",
  ];
  return parts.filter((p) => p).join(" · ");
}

export function MeetProfile_hasAllBests(profile: IMeetProfile): boolean {
  return Object.values(profile.lifts).every((goal) => goal.bestKg > 0);
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
