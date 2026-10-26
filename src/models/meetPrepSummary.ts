import { IHistoryRecord, IMeetLift, IMeetLiftGoal, IMeetProfile, IWeight, meetLifts } from "../types";
import { Dots_score } from "./dots";
import { IMeetAttempts, MeetAttempts_plan, MeetAttempts_platesPerSide } from "./meetAttempts";
import {
  MeetProfile_bodyweightKg,
  MeetProfile_daysUntilMeet,
  MeetProfile_planningMaxKg,
  MeetProfile_recentE1rmKg,
} from "./meetProfile";

export interface IMeetPrepLiftSummary {
  lift: IMeetLift;
  goal: IMeetLiftGoal;
  recentE1rmKg?: number;
  planningMaxKg: number;
  attempts?: IMeetAttempts;
  platesPerSide?: Record<keyof IMeetAttempts, number[] | undefined>;
}

export interface IMeetPrepSummary {
  daysUntilMeet: number;
  bodyweightKg?: number;
  kgToCut?: number;
  lifts: IMeetPrepLiftSummary[];
  bestTotalKg?: number;
  targetTotalKg?: number;
  plannedTotalKg?: number;
  e1rmTotalKg?: number;
  dotsNow?: number;
  dotsPlannedAtClass?: number;
  dotsTargetAtClass?: number;
}

function liftSummary(
  profile: IMeetProfile,
  history: IHistoryRecord[],
  lift: IMeetLift,
  now: number
): IMeetPrepLiftSummary {
  const recentE1rmKg = MeetProfile_recentE1rmKg(history, lift, now);
  const planningMaxKg = MeetProfile_planningMaxKg(profile, lift, recentE1rmKg);
  if (planningMaxKg <= 0) {
    return { lift, goal: profile.lifts[lift], recentE1rmKg, planningMaxKg };
  }
  const attempts = MeetAttempts_plan(planningMaxKg);
  return {
    lift,
    goal: profile.lifts[lift],
    recentE1rmKg,
    planningMaxKg,
    attempts,
    platesPerSide: {
      opener: MeetAttempts_platesPerSide(attempts.opener),
      second: MeetAttempts_platesPerSide(attempts.second),
      third: MeetAttempts_platesPerSide(attempts.third),
    },
  };
}

/** The sum, or undefined unless every lift has a positive value. */
function total(values: (number | undefined)[]): number | undefined {
  return values.every((v) => v != null && v > 0) ? values.reduce<number>((acc, v) => acc + v!, 0) : undefined;
}

function dots(
  totalKg: number | undefined,
  bodyweightKg: number | undefined,
  profile: IMeetProfile
): number | undefined {
  return totalKg != null && bodyweightKg != null && bodyweightKg > 0
    ? Dots_score(totalKg, bodyweightKg, profile.sex)
    : undefined;
}

export function MeetPrepSummary_build(
  profile: IMeetProfile,
  history: IHistoryRecord[],
  loggedBodyweight: IWeight | undefined,
  now: number
): IMeetPrepSummary {
  const lifts = meetLifts.map((lift) => liftSummary(profile, history, lift, now));
  const bodyweightKg = MeetProfile_bodyweightKg(profile, loggedBodyweight);
  const classKg = profile.weightClassKg > 0 ? profile.weightClassKg : undefined;
  const bestTotalKg = total(lifts.map((l) => l.goal.bestKg));
  const e1rmTotalKg = total(lifts.map((l) => l.recentE1rmKg));
  const plannedTotalKg = total(lifts.map((l) => l.attempts?.third));
  const targetTotalKg = total(lifts.map((l) => l.goal.targetKg));
  return {
    daysUntilMeet: MeetProfile_daysUntilMeet(profile, now),
    bodyweightKg,
    kgToCut: bodyweightKg != null && classKg != null ? Math.max(0, bodyweightKg - classKg) : undefined,
    lifts,
    bestTotalKg,
    targetTotalKg,
    plannedTotalKg,
    e1rmTotalKg,
    dotsNow: dots(e1rmTotalKg ?? bestTotalKg, bodyweightKg, profile),
    dotsPlannedAtClass: dots(plannedTotalKg, classKg, profile),
    dotsTargetAtClass: dots(targetTotalKg, classKg, profile),
  };
}
