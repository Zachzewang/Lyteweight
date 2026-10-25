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
  attempts: IMeetAttempts;
  platesPerSide: Record<keyof IMeetAttempts, number[] | undefined>;
}

export interface IMeetPrepSummary {
  daysUntilMeet: number;
  bodyweightKg?: number;
  kgToCut?: number;
  lifts: IMeetPrepLiftSummary[];
  bestTotalKg: number;
  targetTotalKg: number;
  plannedTotalKg: number;
  e1rmTotalKg?: number;
  dotsNow?: number;
  dotsPlannedAtClass: number;
  dotsTargetAtClass: number;
}

function liftSummary(
  profile: IMeetProfile,
  history: IHistoryRecord[],
  lift: IMeetLift,
  now: number
): IMeetPrepLiftSummary {
  const recentE1rmKg = MeetProfile_recentE1rmKg(history, lift, now);
  const planningMaxKg = MeetProfile_planningMaxKg(profile, lift, recentE1rmKg);
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

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function MeetPrepSummary_build(
  profile: IMeetProfile,
  history: IHistoryRecord[],
  loggedBodyweight: IWeight | undefined,
  now: number
): IMeetPrepSummary {
  const lifts = meetLifts.map((lift) => liftSummary(profile, history, lift, now));
  const bodyweightKg = MeetProfile_bodyweightKg(profile, loggedBodyweight);
  const e1rms = lifts.map((l) => l.recentE1rmKg);
  const e1rmTotalKg = e1rms.every((e) => e != null) ? sum(e1rms as number[]) : undefined;
  const plannedTotalKg = sum(lifts.map((l) => l.attempts.third));
  const targetTotalKg = sum(lifts.map((l) => l.goal.targetKg));
  const nowTotalKg = e1rmTotalKg ?? sum(lifts.map((l) => l.goal.bestKg));
  return {
    daysUntilMeet: MeetProfile_daysUntilMeet(profile, now),
    bodyweightKg,
    kgToCut: bodyweightKg != null ? Math.max(0, bodyweightKg - profile.weightClassKg) : undefined,
    lifts,
    bestTotalKg: sum(lifts.map((l) => l.goal.bestKg)),
    targetTotalKg,
    plannedTotalKg,
    e1rmTotalKg,
    dotsNow: bodyweightKg != null ? Dots_score(nowTotalKg, bodyweightKg, profile.sex) : undefined,
    dotsPlannedAtClass: Dots_score(plannedTotalKg, profile.weightClassKg, profile.sex),
    dotsTargetAtClass: Dots_score(targetTotalKg, profile.weightClassKg, profile.sex),
  };
}
