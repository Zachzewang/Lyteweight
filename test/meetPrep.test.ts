import "mocha";
import { expect } from "chai";
import { MeetAttempts_plan, MeetAttempts_platesPerSide } from "../src/models/meetAttempts";
import {
  MeetProfile_bodyweightKg,
  MeetProfile_daysUntilMeet,
  MeetProfile_parseDate,
  MeetProfile_parseKg,
  MeetProfile_planningMaxKg,
  MeetProfile_recentE1rmKg,
  MeetProfile_seed,
  MeetProfile_withLiftGoal,
} from "../src/models/meetProfile";
import { Weight_build, Weight_getOneRepMax } from "../src/models/weight";
import { MeetPrepSummary_build } from "../src/models/meetPrepSummary";
import { Dots_score } from "../src/models/dots";
import { IHistoryRecord, ISet } from "../src/types";

const day = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 25, 12, 0).getTime();

function set(kg: number, reps: number, rpe?: number, isCompleted: boolean = true): ISet {
  return {
    vtype: "set",
    id: `${kg}-${reps}-${rpe}`,
    index: 0,
    reps,
    weight: Weight_build(kg, "kg"),
    completedWeight: Weight_build(kg, "kg"),
    completedReps: reps,
    completedRpe: rpe,
    isCompleted,
  };
}

function record(daysAgo: number, exerciseId: string, sets: ISet[]): IHistoryRecord {
  return {
    vtype: "history_record",
    id: daysAgo,
    date: new Date(now - daysAgo * day).toISOString(),
    startTime: now - daysAgo * day,
    endTime: now - daysAgo * day,
    day: 1,
    dayName: "Day 1",
    programId: "p",
    programName: "P",
    entries: [{ vtype: "history_entry", id: "e", index: 0, exercise: { id: exerciseId }, sets, warmupSets: [] }],
  };
}

describe("MeetAttempts", () => {
  it("plans openers, seconds and thirds in 2.5kg steps", () => {
    expect(MeetAttempts_plan(145)).to.eql({ opener: 130, second: 140, third: 147.5 });
    expect(MeetAttempts_plan(100)).to.eql({ opener: 90, second: 95, third: 100 });
  });

  it("keeps attempts strictly increasing for small maxes", () => {
    const { opener, second, third } = MeetAttempts_plan(40);
    expect(second).to.be.greaterThan(opener);
    expect(third).to.be.greaterThan(second);
  });

  it("loads plates per side on a 25kg bar with collars", () => {
    expect(MeetAttempts_platesPerSide(82.5)).to.eql([25, 2.5, 1.25]);
    expect(MeetAttempts_platesPerSide(145)).to.eql([25, 25, 10]);
    expect(MeetAttempts_platesPerSide(25)).to.eql([]);
    expect(MeetAttempts_platesPerSide(20)).to.equal(undefined);
  });
});

describe("MeetProfile", () => {
  it("counts days until the meet from the start of today", () => {
    expect(MeetProfile_daysUntilMeet(MeetProfile_seed, now)).to.equal(118);
  });

  it("takes the best RPE-adjusted e1RM from recent completed sets of the lift", () => {
    const history = [
      record(3, "squat", [set(110, 3, 8), set(95, 5, 7)]),
      record(10, "squat", [set(120, 1, undefined, false)]),
      record(60, "squat", [set(140, 1)]),
      record(2, "benchPress", [set(90, 1)]),
      record(5, "squat", [set(60, 15)]),
    ];
    const expected = Weight_getOneRepMax(Weight_build(110, "kg"), 3, 8).value;
    expect(MeetProfile_recentE1rmKg(history, "squat", now)).to.equal(expected);
    expect(MeetProfile_recentE1rmKg(history, "deadlift", now)).to.equal(undefined);
  });

  it("plans from the higher of the best and the recent e1RM, unless overridden", () => {
    const profile = MeetProfile_seed;
    expect(MeetProfile_planningMaxKg(profile, "squat", 120)).to.equal(132.5);
    expect(MeetProfile_planningMaxKg(profile, "squat", 137.3)).to.equal(137.3);
    const overridden = {
      ...profile,
      lifts: { ...profile.lifts, squat: { ...profile.lifts.squat, planningMaxKg: 140 } },
    };
    expect(MeetProfile_planningMaxKg(overridden, "squat", 137.3)).to.equal(140);
  });

  it("summarizes totals, cut and DOTS for the seeded profile with no history", () => {
    const summary = MeetPrepSummary_build(MeetProfile_seed, [], undefined, now);
    expect(summary.daysUntilMeet).to.equal(118);
    expect(summary.bodyweightKg).to.equal(70);
    expect(summary.kgToCut).to.equal(2.5);
    expect(summary.bestTotalKg).to.equal(360);
    expect(summary.targetTotalKg).to.equal(405);
    expect(summary.e1rmTotalKg).to.equal(undefined);
    expect(summary.dotsNow).to.be.closeTo(Dots_score(360, 70, "male"), 0.001);
    expect(summary.dotsTargetAtClass).to.be.closeTo(Dots_score(405, 67.5, "male"), 0.001);
    const squat = summary.lifts.find((l) => l.lift === "squat")!;
    expect(squat.attempts).to.eql(MeetAttempts_plan(132.5));
    expect(squat.platesPerSide.opener).to.eql(MeetAttempts_platesPerSide(squat.attempts.opener));
  });

  it("parses edited kg values and meet dates, rejecting bad input", () => {
    expect(MeetProfile_parseKg("132.5")).to.equal(132.5);
    expect(MeetProfile_parseKg("")).to.equal(undefined);
    expect(MeetProfile_parseKg("-5")).to.equal(undefined);
    expect(MeetProfile_parseKg("abc")).to.equal(undefined);
    expect(MeetProfile_parseDate("2027-02-20")).to.equal("2027-02-20");
    expect(MeetProfile_parseDate("2027-02-30")).to.equal(undefined);
    expect(MeetProfile_parseDate("Feb 20")).to.equal(undefined);
  });

  it("changes one lift goal without touching the others", () => {
    const updated = MeetProfile_withLiftGoal(MeetProfile_seed, "bench", { targetKg: 102.5 });
    expect(updated.lifts.bench).to.eql({ bestKg: 82.5, targetKg: 102.5 });
    expect(updated.lifts.squat).to.equal(MeetProfile_seed.lifts.squat);
    expect(MeetProfile_seed.lifts.bench.targetKg).to.equal(100);
  });

  it("prefers logged bodyweight over the profile's", () => {
    expect(MeetProfile_bodyweightKg(MeetProfile_seed, Weight_build(68.4, "kg"))).to.equal(68.4);
    expect(MeetProfile_bodyweightKg(MeetProfile_seed, undefined)).to.equal(70);
  });
});
