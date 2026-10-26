import { IBodyCompositionEntry, IStats, IStatsPercentageValue, IStatsWeightValue } from "../types";
import { Weight_build } from "./weight";

export interface IWithingsApiMeasure {
  value: number;
  type: number;
  unit: number;
}

export interface IWithingsApiMeasureGroup {
  grpid: number;
  date: number;
  category?: number;
  measures: IWithingsApiMeasure[];
}

// Withings measure type codes ("meastype") from the getmeas API. Codes not listed here are still kept, under
// `type<code>`, so no measurement a device reports is dropped.
const measureNames: Record<number, string> = {
  1: "weightKg",
  4: "heightM",
  5: "fatFreeMassKg",
  6: "fatRatioPct",
  8: "fatMassKg",
  9: "diastolicBp",
  10: "systolicBp",
  11: "heartPulseBpm",
  12: "temperatureC",
  54: "spo2Pct",
  71: "bodyTemperatureC",
  73: "skinTemperatureC",
  76: "muscleMassKg",
  77: "hydrationKg",
  88: "boneMassKg",
  91: "pulseWaveVelocity",
  123: "vo2max",
  155: "vascularAge",
  167: "nerveHealthScore",
  168: "extracellularWaterKg",
  169: "intracellularWaterKg",
  170: "visceralFat",
  226: "basalMetabolicRateKcal",
  227: "metabolicAge",
};

export const WithingsData_labels: Record<string, string> = {
  weightKg: "Weight (kg)",
  heightM: "Height (m)",
  fatFreeMassKg: "Fat-free mass (kg)",
  fatRatioPct: "Body fat (%)",
  fatMassKg: "Fat mass (kg)",
  diastolicBp: "Diastolic BP (mmHg)",
  systolicBp: "Systolic BP (mmHg)",
  heartPulseBpm: "Heart rate (bpm)",
  temperatureC: "Temperature (°C)",
  spo2Pct: "SpO2 (%)",
  bodyTemperatureC: "Body temperature (°C)",
  skinTemperatureC: "Skin temperature (°C)",
  muscleMassKg: "Muscle mass (kg)",
  hydrationKg: "Body water (kg)",
  boneMassKg: "Bone mass (kg)",
  pulseWaveVelocity: "Pulse wave velocity (m/s)",
  vo2max: "VO2 max",
  vascularAge: "Vascular age",
  nerveHealthScore: "Nerve health score",
  extracellularWaterKg: "Extracellular water (kg)",
  intracellularWaterKg: "Intracellular water (kg)",
  visceralFat: "Visceral fat",
  basalMetabolicRateKcal: "Basal metabolic rate (kcal)",
  metabolicAge: "Metabolic age",
};

function decode(measure: IWithingsApiMeasure): number {
  return Math.round(measure.value * Math.pow(10, measure.unit) * 1000) / 1000;
}

export function WithingsData_toEntries(groups: IWithingsApiMeasureGroup[]): IBodyCompositionEntry[] {
  return groups.map((group) => {
    const values: Record<string, number | undefined> = {};
    for (const measure of group.measures) {
      values[measureNames[measure.type] ?? `type${measure.type}`] = decode(measure);
    }
    return { id: group.grpid, timestamp: group.date * 1000, values };
  });
}

export function WithingsData_mergeEntries(
  existing: IBodyCompositionEntry[],
  incoming: IBodyCompositionEntry[]
): IBodyCompositionEntry[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const entry of incoming) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/** Adds Withings weight and body fat readings to the app's own stats, skipping timestamps it already has. */
export function WithingsData_addToStats(stats: IStats, entries: IBodyCompositionEntry[], now: number): IStats {
  const weights = [...(stats.weight.weight ?? [])];
  const bodyfats = [...(stats.percentage.bodyfat ?? [])];
  const weightTimestamps = new Set(weights.map((w) => w.timestamp));
  const bodyfatTimestamps = new Set(bodyfats.map((b) => b.timestamp));
  for (const entry of entries) {
    const weightKg = entry.values.weightKg;
    if (weightKg != null && !weightTimestamps.has(entry.timestamp)) {
      const value: IStatsWeightValue = {
        vtype: "stat",
        value: Weight_build(weightKg, "kg"),
        timestamp: entry.timestamp,
        updatedAt: now,
      };
      weights.push(value);
      weightTimestamps.add(entry.timestamp);
    }
    const fatPct = entry.values.fatRatioPct;
    if (fatPct != null && !bodyfatTimestamps.has(entry.timestamp)) {
      const value: IStatsPercentageValue = {
        vtype: "stat",
        value: { value: fatPct, unit: "%" },
        timestamp: entry.timestamp,
        updatedAt: now,
      };
      bodyfats.push(value);
      bodyfatTimestamps.add(entry.timestamp);
    }
  }
  weights.sort((a, b) => b.timestamp - a.timestamp);
  bodyfats.sort((a, b) => b.timestamp - a.timestamp);
  return {
    ...stats,
    weight: { ...stats.weight, weight: weights },
    percentage: { ...stats.percentage, bodyfat: bodyfats },
  };
}
