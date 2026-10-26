import { IIntegrations } from "../types";
import {
  IWhoopApiCycle,
  IWhoopApiData,
  IWhoopApiRecovery,
  IWhoopApiSleep,
  IWhoopApiWorkout,
  WhoopData_mergeDays,
  WhoopData_mergeWorkouts,
  WhoopData_toDays,
  WhoopData_toWorkouts,
} from "./whoopData";
import { IWithingsApiMeasureGroup, WithingsData_mergeEntries, WithingsData_toEntries } from "./withingsData";

export type IIntegrationsFetch = (url: string, init?: RequestInit) => Promise<Response>;
export type IIntegrationProvider = "whoop" | "withings";

export interface IIntegrationsStatus {
  whoop: boolean;
  withings: boolean;
  configured: { whoop: boolean; withings: boolean };
}

export interface IIntegrationsFetched {
  whoop?: IWhoopApiData;
  withings?: IWithingsApiMeasureGroup[];
}

export const IntegrationsSync_empty: IIntegrations = { whoopDays: [], whoopWorkouts: [], bodyComposition: [] };

// Re-fetch the last 3 days on every sync, because WHOOP re-scores recent sleeps and cycles after the fact.
const overlapMs = 3 * 24 * 60 * 60 * 1000;
// WHOOP pages hold 25 records, so 400 pages is about 27 years of daily cycles.
const maxPages = 400;
const whoopPageSize = 25;

async function getJson<T>(fetch: IIntegrationsFetch, url: string, key: string): Promise<T> {
  const response = await fetch(url, { headers: { "X-Sync-Key": key } });
  if (!response.ok) {
    throw new Error(`${url.split("?")[0]} failed with ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

export function IntegrationsSync_connectUrl(base: string, provider: IIntegrationProvider, key: string): string {
  return `${base}/integrations/${provider}/connect?key=${encodeURIComponent(key)}`;
}

export function IntegrationsSync_status(
  fetch: IIntegrationsFetch,
  base: string,
  key: string
): Promise<IIntegrationsStatus> {
  return getJson<IIntegrationsStatus>(fetch, `${base}/integrations/status`, key);
}

async function whoopRecords<T>(
  fetch: IIntegrationsFetch,
  base: string,
  key: string,
  path: string,
  startIso: string | undefined
): Promise<T[]> {
  const records: T[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ path, limit: `${whoopPageSize}` });
    if (startIso) {
      params.set("start", startIso);
    }
    if (nextToken) {
      params.set("nextToken", nextToken);
    }
    const result = await getJson<{ records?: T[]; next_token?: string | null }>(
      fetch,
      `${base}/integrations/whoop/api?${params.toString()}`,
      key
    );
    records.push(...(result.records ?? []));
    nextToken = result.next_token ?? undefined;
    if (!nextToken) {
      break;
    }
  }
  return records;
}

async function withingsGroups(
  fetch: IIntegrationsFetch,
  base: string,
  key: string,
  lastUpdateSec: number
): Promise<IWithingsApiMeasureGroup[]> {
  const groups: IWithingsApiMeasureGroup[] = [];
  let offset: number | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ lastupdate: `${lastUpdateSec}` });
    if (offset != null) {
      params.set("offset", `${offset}`);
    }
    const result = await getJson<{
      status: number;
      error?: string;
      body?: { measuregrps?: IWithingsApiMeasureGroup[]; more?: number | boolean; offset?: number };
    }>(fetch, `${base}/integrations/withings/measure?${params.toString()}`, key);
    if (result.status !== 0) {
      throw new Error(`Withings returned status ${result.status}${result.error ? `: ${result.error}` : ""}`);
    }
    groups.push(...(result.body?.measuregrps ?? []));
    if (!result.body?.more || result.body.offset == null) {
      break;
    }
    offset = result.body.offset;
  }
  return groups;
}

export async function IntegrationsSync_fetch(
  fetch: IIntegrationsFetch,
  base: string,
  key: string,
  lastSyncTs: number | undefined
): Promise<IIntegrationsFetched> {
  const status = await IntegrationsSync_status(fetch, base, key);
  const sinceMs = lastSyncTs != null ? lastSyncTs - overlapMs : undefined;
  const fetched: IIntegrationsFetched = {};
  if (status.whoop) {
    const startIso = sinceMs != null ? new Date(sinceMs).toISOString() : undefined;
    fetched.whoop = {
      recoveries: await whoopRecords<IWhoopApiRecovery>(fetch, base, key, "/v2/recovery", startIso),
      sleeps: await whoopRecords<IWhoopApiSleep>(fetch, base, key, "/v2/activity/sleep", startIso),
      cycles: await whoopRecords<IWhoopApiCycle>(fetch, base, key, "/v2/cycle", startIso),
      workouts: await whoopRecords<IWhoopApiWorkout>(fetch, base, key, "/v2/activity/workout", startIso),
    };
  }
  if (status.withings) {
    fetched.withings = await withingsGroups(fetch, base, key, sinceMs != null ? Math.floor(sinceMs / 1000) : 0);
  }
  return fetched;
}

export function IntegrationsSync_apply(
  integrations: IIntegrations | undefined,
  fetched: IIntegrationsFetched,
  now: number
): IIntegrations {
  const current = integrations ?? IntegrationsSync_empty;
  return {
    ...current,
    lastSyncTs: now,
    lastSyncError: undefined,
    whoopDays: fetched.whoop
      ? WhoopData_mergeDays(current.whoopDays, WhoopData_toDays(fetched.whoop))
      : current.whoopDays,
    whoopWorkouts: fetched.whoop
      ? WhoopData_mergeWorkouts(current.whoopWorkouts, WhoopData_toWorkouts(fetched.whoop.workouts))
      : current.whoopWorkouts,
    bodyComposition: fetched.withings
      ? WithingsData_mergeEntries(current.bodyComposition, WithingsData_toEntries(fetched.withings))
      : current.bodyComposition,
  };
}

// Auto-sync runs on app open, at most this often.
const autoSyncIntervalMs = 60 * 60 * 1000;

export function IntegrationsSync_isDue(integrations: IIntegrations | undefined, now: number): boolean {
  if (!integrations?.syncKey) {
    return false;
  }
  return integrations.lastSyncTs == null || now - integrations.lastSyncTs >= autoSyncIntervalMs;
}
