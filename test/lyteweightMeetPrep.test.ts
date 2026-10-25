import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { parseProgramMarkdownContent } from "../src/utils/programUtils";
import { PlannerEvaluator_getFullEvaluatedWeeks } from "../src/pages/planner/plannerEvaluator";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_nextHistoryRecordFromEvaluated,
  Program_runAllFinishDayScripts,
} from "../src/models/program";
import { Progress_getDayData, Progress_runUpdateScriptForEntry } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Exercise_toKey } from "../src/models/exercise";
import { Weight_build, Weight_rpeMultiplier } from "../src/models/weight";
import { IHistoryRecord, ISettings } from "../src/types";

const programFile = path.resolve(__dirname, "../programs/builtin/lyteweight-meet-prep.md");

function liftoscript(): string {
  const { content, data } = matter(fs.readFileSync(programFile, "utf-8"));
  expect(parseProgramMarkdownContent(content, data).liftoscriptError).to.equal(undefined);
  const match = content.match(/```liftoscript\n([\s\S]*?)```/);
  expect(match).to.not.equal(null);
  return match![1];
}

function kgSettings(): ISettings {
  const settings = Settings_build();
  settings.units = "kg";
  return settings;
}

function startDay(settings: ISettings, day: number): { evaluated: IEvaluatedProgram; record: IHistoryRecord } {
  const { program } = PlannerTestUtils_get(liftoscript());
  const evaluated = Program_evaluate(program, settings);
  const record = Program_nextHistoryRecordFromEvaluated(evaluated, settings, Stats_getEmpty(), day);
  return { evaluated, record };
}

function withSquatRm1(settings: ISettings, record: IHistoryRecord, kg: number): void {
  const squat = record.entries.find((e) => e.exercise.id === "squat")!;
  settings.exerciseData[Exercise_toKey(squat.exercise)] = { rm1: Weight_build(kg, "kg") };
}

function completeTopSetAndRunUpdate(
  settings: ISettings,
  evaluated: IEvaluatedProgram,
  record: IHistoryRecord,
  weightKg: number,
  reps: number,
  rpe: number
): IHistoryRecord["entries"][number] {
  const entry = record.entries.find((e) => e.exercise.id === "squat")!;
  const top = entry.sets[0];
  top.completedWeight = Weight_build(weightKg, "kg");
  top.completedReps = reps;
  top.completedRpe = rpe;
  top.isCompleted = true;
  const day = evaluated.weeks.flatMap((w) => w.days)[record.day - 1];
  const programExercise = day.exercises.find((e) => e.key === entry.programExerciseId)!;
  return Progress_runUpdateScriptForEntry(
    entry,
    Progress_getDayData(record),
    programExercise,
    evaluated.states,
    0,
    settings,
    Stats_getEmpty()
  );
}

describe("Lyteweight meet prep program", () => {
  it("parses without errors into 17 weeks", () => {
    const { evaluatedWeeks } = PlannerEvaluator_getFullEvaluatedWeeks(liftoscript(), kgSettings());
    expect(evaluatedWeeks.success, evaluatedWeeks.success ? "" : evaluatedWeeks.error.message).to.equal(true);
    const { program } = PlannerTestUtils_get(liftoscript());
    const evaluated = Program_evaluate(program, kgSettings());
    expect(evaluated.weeks.length).to.equal(17);
    for (const week of evaluated.weeks.slice(0, 16)) {
      expect(week.days.length).to.equal(4);
    }
    expect(evaluated.weeks[16].days.length).to.equal(2);
  });

  it("repeats the block's accessories into later weeks", () => {
    const { program } = PlannerTestUtils_get(liftoscript());
    const evaluated = Program_evaluate(program, kgSettings());
    const week5Day4 = evaluated.weeks[4].days[3].exercises.map((e) => e.exerciseType?.id);
    expect(week5Day4).to.include("romanianDeadlift");
    const week10Day2 = evaluated.weeks[9].days[1].exercises.map((e) => e.fullName);
    expect(week10Day2.some((n) => n.startsWith("vol:"))).to.equal(true);
  });

  it("sizes the first top set from 1RM and the target RPE", () => {
    const settings = kgSettings();
    const probe = startDay(settings, 1);
    withSquatRm1(settings, probe.record, 132.5);
    const { record } = startDay(settings, 1);
    const squat = record.entries.find((e) => e.exercise.id === "squat")!;
    // Week 1 squat top set is 1x6 @7: 132.5kg * rpeMultiplier(6, 7), rounded to 2.5kg.
    const expected = Math.round((132.5 * Weight_rpeMultiplier(6, 7)) / 2.5) * 2.5;
    expect(squat.sets[0].weight?.value).to.equal(expected);
  });

  it("drops the back-offs when the top set felt harder than planned, and raises them when easier", () => {
    const backoffAfter = (rpe: number): number => {
      const settings = kgSettings();
      const probe = startDay(settings, 1);
      withSquatRm1(settings, probe.record, 132.5);
      const { evaluated, record } = startDay(settings, 1);
      const entry = completeTopSetAndRunUpdate(settings, evaluated, record, 100, 6, rpe);
      return entry.sets[1].weight!.value;
    };

    const hard = backoffAfter(9);
    const planned = backoffAfter(7);
    const easy = backoffAfter(6);
    expect(hard).to.be.lessThan(planned);
    expect(easy).to.be.greaterThan(planned);

    // Back-off is 3x6 @6: e1RM (100kg / rpeMultiplier(6, 9)) * rpeMultiplier(6, 6), rounded to loadable plates.
    const e1rm = 100 / Weight_rpeMultiplier(6, 9);
    expect(hard).to.be.closeTo(e1rm * Weight_rpeMultiplier(6, 6), 1.25);
  });

  it("autoregulates in the strength block too", () => {
    const backoffAfter = (rpe: number): number => {
      const settings = kgSettings();
      const week9Day1 = 33;
      const probe = startDay(settings, week9Day1);
      withSquatRm1(settings, probe.record, 132.5);
      const { evaluated, record } = startDay(settings, week9Day1);
      expect(Progress_getDayData(record).week).to.equal(9);
      const entry = completeTopSetAndRunUpdate(settings, evaluated, record, 110, 3, rpe);
      return entry.sets[1].weight!.value;
    };
    expect(backoffAfter(9.5)).to.be.lessThan(backoffAfter(7));
  });

  it("leaves the back-offs alone when no RPE was logged", () => {
    const settings = kgSettings();
    const probe = startDay(settings, 1);
    withSquatRm1(settings, probe.record, 132.5);
    const { evaluated, record } = startDay(settings, 1);
    const before = record.entries.find((e) => e.exercise.id === "squat")!.sets[1].weight!.value;
    const entry = completeTopSetAndRunUpdate(settings, evaluated, record, 100, 6, 0);
    expect(entry.sets[1].weight!.value).to.equal(before);
  });

  it("saves the top set's estimated 1RM as the new 1RM after the workout", () => {
    const settings = kgSettings();
    const probe = startDay(settings, 1);
    withSquatRm1(settings, probe.record, 132.5);
    const { program } = PlannerTestUtils_get(liftoscript());
    const { evaluated, record } = startDay(settings, 1);
    const entry = completeTopSetAndRunUpdate(settings, evaluated, record, 100, 6, 8);
    record.entries = record.entries.map((e) => (e.id === entry.id ? entry : e));

    const { exerciseData } = Program_runAllFinishDayScripts(program, record, Stats_getEmpty(), settings);
    const rm1 = exerciseData[Exercise_toKey(entry.exercise)]?.rm1;
    expect(rm1?.unit).to.equal("kg");
    expect(rm1?.value).to.be.closeTo(100 / Weight_rpeMultiplier(6, 8), 0.25);
  });
});
