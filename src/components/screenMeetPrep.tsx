import { JSX } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { Button } from "./button";
import { IHistoryRecord, IMeetLift, IMeetProfile, ISettings, IStats } from "../types";
import { IState, updateState } from "../models/state";
import { Stats_getCurrentBodyweight } from "../models/stats";
import { Settings_setOneRM } from "../models/settings";
import { Weight_build } from "../models/weight";
import { Dialog_confirm } from "../utils/dialog";
import {
  MeetProfile_exerciseTypes,
  MeetProfile_formatKg,
  MeetProfile_get,
  MeetProfile_hasAllBests,
  MeetProfile_headline,
  MeetProfile_kgInput,
  MeetProfile_liftNames,
  MeetProfile_parseDate,
  MeetProfile_parseKg,
  MeetProfile_withLiftGoal,
} from "../models/meetProfile";
import { IMeetPrepLiftSummary, MeetPrepSummary_build } from "../models/meetPrepSummary";
import { IMeetAttempts, MeetAttempts_formatPlates } from "../models/meetAttempts";

interface IProps {
  dispatch: IDispatch;
  meetProfile?: IMeetProfile;
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
}

const attemptLabels: [keyof IMeetAttempts, string][] = [
  ["opener", "Opener"],
  ["second", "Second"],
  ["third", "Third"],
];

export function ScreenMeetPrep(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Meet Prep" });
  const profile = MeetProfile_get(props.meetProfile, Date.now());
  const summary = MeetPrepSummary_build(profile, props.history, Stats_getCurrentBodyweight(props.stats), Date.now());

  const save = (newProfile: IMeetProfile, desc: string): void => {
    updateState(props.dispatch, [lb<IState>().p("storage").p("meetProfile").record(newProfile)], desc);
  };
  const saveLift = (lift: IMeetLift, field: "bestKg" | "targetKg" | "planningMaxKg", text?: string): void => {
    const kg = MeetProfile_parseKg(text);
    if (kg != null || field === "planningMaxKg") {
      save(MeetProfile_withLiftGoal(profile, lift, { [field]: kg }), `Meet prep: ${lift} ${field}`);
    }
  };

  return (
    <View className="px-gutter pb-8">
      <Text className="pt-2 text-sm text-text-secondary">{MeetProfile_headline(profile, summary.daysUntilMeet)}</Text>

      <GroupHeader name="Meet" topPadding={true} />
      <MenuItemEditable
        type="text"
        name="Federation"
        value={profile.federation}
        onChange={(v) => save({ ...profile, federation: (v ?? "").trim() }, "Meet prep: federation")}
      />
      <MenuItemEditable
        type="select"
        name="Division"
        value={profile.division}
        values={[
          ["Raw", "Raw"],
          ["Equipped", "Equipped"],
        ]}
        onChange={(v) => save({ ...profile, division: v ?? "Raw" }, "Meet prep: division")}
      />
      <MenuItemEditable
        type="select"
        name="Sex (for DOTS)"
        value={profile.sex}
        values={[
          ["male", "Male"],
          ["female", "Female"],
        ]}
        onChange={(v) => save({ ...profile, sex: v === "female" ? "female" : "male" }, "Meet prep: sex")}
      />
      <MenuItemEditable
        type="text"
        name="Meet date"
        value={profile.meetDate}
        onChange={(v) => {
          const date = MeetProfile_parseDate(v);
          if (date) {
            save({ ...profile, meetDate: date }, "Meet prep: date");
          }
        }}
      />
      <MenuItemEditable
        type="number"
        name="Weight class"
        value={MeetProfile_kgInput(profile.weightClassKg)}
        valueUnits="kg"
        onChange={(v) => {
          const kg = MeetProfile_parseKg(v);
          if (kg != null) {
            save({ ...profile, weightClassKg: kg }, "Meet prep: weight class");
          }
        }}
      />
      <MenuItemEditable
        type="number"
        name="Bodyweight"
        value={MeetProfile_kgInput(summary.bodyweightKg)}
        valueUnits="kg"
        onChange={(v) => {
          const kg = MeetProfile_parseKg(v);
          if (kg != null) {
            save({ ...profile, bodyweightKg: kg }, "Meet prep: bodyweight");
          }
        }}
      />
      <MenuItem name="Left to cut" value={MeetProfile_formatKg(summary.kgToCut)} />

      {summary.lifts.map((lift) => (
        <LiftSection key={lift.lift} lift={lift} onChange={saveLift} />
      ))}

      <GroupHeader name="Total & DOTS" topPadding={true} />
      <MenuItem name="Best total" value={MeetProfile_formatKg(summary.bestTotalKg)} />
      <MenuItem name="e1RM total (last 6 weeks)" value={MeetProfile_formatKg(summary.e1rmTotalKg)} />
      <MenuItem name="Planned thirds total" value={MeetProfile_formatKg(summary.plannedTotalKg)} />
      <MenuItem name="Target total" value={MeetProfile_formatKg(summary.targetTotalKg)} />
      <MenuItem name="DOTS now" value={summary.dotsNow != null ? summary.dotsNow.toFixed(1) : "-"} />
      {summary.dotsPlannedAtClass != null && (
        <MenuItem
          name={`DOTS, planned thirds at ${profile.weightClassKg} kg`}
          value={summary.dotsPlannedAtClass.toFixed(1)}
        />
      )}
      {summary.dotsTargetAtClass != null && (
        <MenuItem
          name={`DOTS, target total at ${profile.weightClassKg} kg`}
          value={summary.dotsTargetAtClass.toFixed(1)}
        />
      )}

      {MeetProfile_hasAllBests(profile) && (
        <View className="items-center pt-6">
          <Button
            name="meet-prep-set-1rms"
            kind="purple"
            onClick={async () => {
              if (await Dialog_confirm("Set the 1RM of Squat, Bench Press and Deadlift to your best lifts?")) {
                for (const lift of summary.lifts) {
                  const weight = Weight_build(lift.goal.bestKg, "kg");
                  Settings_setOneRM(props.dispatch, MeetProfile_exerciseTypes[lift.lift], weight, props.settings);
                }
              }
            }}
          >
            Use bests as program 1RMs
          </Button>
          <Text className="pt-2 text-xs text-center text-text-secondary">
            Top sets in Lyteweight Meet Prep are sized from these 1RMs.
          </Text>
        </View>
      )}
    </View>
  );
}

function LiftSection(props: {
  lift: IMeetPrepLiftSummary;
  onChange: (lift: IMeetLift, field: "bestKg" | "targetKg" | "planningMaxKg", text?: string) => void;
}): JSX.Element {
  const { lift } = props;
  return (
    <View>
      <GroupHeader name={MeetProfile_liftNames[lift.lift]} topPadding={true} />
      <MenuItemEditable
        type="number"
        name="Best"
        value={MeetProfile_kgInput(lift.goal.bestKg)}
        valueUnits="kg"
        onChange={(v) => props.onChange(lift.lift, "bestKg", v)}
      />
      <MenuItemEditable
        type="number"
        name="Target"
        value={MeetProfile_kgInput(lift.goal.targetKg)}
        valueUnits="kg"
        onChange={(v) => props.onChange(lift.lift, "targetKg", v)}
      />
      <MenuItem name="e1RM (last 6 weeks)" value={MeetProfile_formatKg(lift.recentE1rmKg)} />
      <MenuItemEditable
        type="number"
        name="Plan attempts from"
        value={MeetProfile_kgInput(Math.round(lift.planningMaxKg * 10) / 10)}
        valueUnits="kg"
        onChange={(v) => props.onChange(lift.lift, "planningMaxKg", v)}
      />
      {lift.attempts == null ? (
        <Text className="py-2 text-sm text-text-secondary">Enter your best to plan attempts.</Text>
      ) : (
        attemptLabels.map(([key, label]) => (
          <MenuItem
            key={key}
            name={label}
            value={
              <View className="items-end">
                <Text className="text-base font-bold text-text-primary">{lift.attempts![key]} kg</Text>
                <Text className="text-xs text-text-secondary">
                  {MeetAttempts_formatPlates(lift.platesPerSide?.[key])}
                </Text>
              </View>
            }
          />
        ))
      )}
    </View>
  );
}
