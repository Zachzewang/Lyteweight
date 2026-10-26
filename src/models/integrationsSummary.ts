import { IBodyCompositionEntry, IIntegrations, IWhoopDay, IWhoopWorkout } from "../types";
import { WithingsData_labels } from "./withingsData";

export interface IIntegrationsRow {
  name: string;
  value: string;
}

function fmt(value: number | undefined, suffix: string, digits: number = 0): string | undefined {
  return value == null ? undefined : `${value.toFixed(digits)}${suffix}`;
}

function rows(pairs: [string, string | undefined][]): IIntegrationsRow[] {
  return pairs.filter((p): p is [string, string] => p[1] != null).map(([name, value]) => ({ name, value }));
}

export function IntegrationsSummary_recoveryColor(score: number | undefined): "green" | "yellow" | "red" | undefined {
  if (score == null) {
    return undefined;
  }
  return score >= 67 ? "green" : score >= 34 ? "yellow" : "red";
}

export function IntegrationsSummary_whoopDayRows(day: IWhoopDay): IIntegrationsRow[] {
  return rows([
    ["Recovery", fmt(day.recoveryScore, "%")],
    ["HRV", fmt(day.hrvMs, " ms", 1)],
    ["Resting heart rate", fmt(day.restingHr, " bpm")],
    ["Sleep performance", fmt(day.sleepPerformance, "%")],
    ["Sleep", fmt(day.sleepHours, " h", 1)],
    ["Sleep need", fmt(day.sleepNeedHours, " h", 1)],
    ["Sleep debt", fmt(day.sleepDebtHours, " h", 1)],
    ["Deep sleep", fmt(day.deepHours, " h", 1)],
    ["REM sleep", fmt(day.remHours, " h", 1)],
    ["Light sleep", fmt(day.lightHours, " h", 1)],
    ["Awake in bed", fmt(day.awakeHours, " h", 1)],
    ["Sleep efficiency", fmt(day.sleepEfficiency, "%")],
    ["Sleep consistency", fmt(day.sleepConsistency, "%")],
    ["Disturbances", fmt(day.disturbances, "")],
    ["Respiratory rate", fmt(day.respiratoryRate, " /min", 1)],
    ["Blood oxygen", fmt(day.spo2, "%", 1)],
    ["Skin temperature", fmt(day.skinTempC, " °C", 1)],
    ["Day strain", fmt(day.strain, "", 1)],
    ["Energy", fmt(day.kilojoule != null ? day.kilojoule / 4.184 : undefined, " kcal")],
    ["Average heart rate", fmt(day.avgHr, " bpm")],
    ["Max heart rate", fmt(day.maxHr, " bpm")],
  ]);
}

export function IntegrationsSummary_weekLine(day: IWhoopDay): string {
  const parts = [
    fmt(day.recoveryScore, "% recovery"),
    fmt(day.hrvMs, " ms HRV"),
    fmt(day.sleepHours, " h sleep", 1),
    fmt(day.strain, " strain", 1),
  ].filter((p) => p != null);
  return parts.length > 0 ? parts.join(" · ") : "Not scored yet";
}

export function IntegrationsSummary_workoutLine(workout: IWhoopWorkout): string {
  const minutes = Math.round((workout.end - workout.start) / 60000);
  const parts = [
    `${minutes} min`,
    fmt(workout.strain, " strain", 1),
    fmt(workout.avgHr, " bpm avg"),
    fmt(workout.kilojoule != null ? workout.kilojoule / 4.184 : undefined, " kcal"),
  ].filter((p) => p != null);
  return parts.join(" · ");
}

export function IntegrationsSummary_bodyRows(entry: IBodyCompositionEntry): IIntegrationsRow[] {
  return Object.entries(entry.values)
    .filter((e): e is [string, number] => e[1] != null)
    .map(([key, value]) => ({ name: WithingsData_labels[key] ?? key, value: `${Math.round(value * 100) / 100}` }));
}

export function IntegrationsSummary_latestBody(
  integrations: IIntegrations | undefined
): IBodyCompositionEntry | undefined {
  return integrations?.bodyComposition[0];
}
