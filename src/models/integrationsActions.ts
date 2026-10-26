import { lb } from "lens-shmens";
import { Platform } from "react-native";
import { IDispatch } from "../ducks/types";
import { IIntegrations } from "../types";
import { IState, updateState } from "./state";
import {
  IIntegrationProvider,
  IIntegrationsFetch,
  IIntegrationsStatus,
  IntegrationsSync_apply,
  IntegrationsSync_connectUrl,
  IntegrationsSync_empty,
  IntegrationsSync_fetch,
  IntegrationsSync_status,
} from "./integrationsSync";
import { WithingsData_addToStats, WithingsData_toEntries } from "./withingsData";

let inFlight: Promise<void> | undefined;

/** The web app calls its own origin; the native app calls the hosted web app, where the Pages Functions run. */
export function IntegrationsActions_baseUrl(): string {
  if (Platform.OS === "web") {
    return "";
  }
  return (globalThis as { __HOST__?: string }).__HOST__ ?? "https://lyteweight.pages.dev";
}

export function IntegrationsActions_setSyncKey(dispatch: IDispatch, syncKey: string): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("integrations")
        .recordModify((i) => ({ ...(i ?? IntegrationsSync_empty), syncKey: syncKey.trim() || undefined })),
    ],
    "Set integrations sync key"
  );
}

export function IntegrationsActions_connectUrl(provider: IIntegrationProvider, syncKey: string): string {
  return IntegrationsSync_connectUrl(IntegrationsActions_baseUrl(), provider, syncKey);
}

export function IntegrationsActions_status(fetch: IIntegrationsFetch, syncKey: string): Promise<IIntegrationsStatus> {
  return IntegrationsSync_status(fetch, IntegrationsActions_baseUrl(), syncKey);
}

export async function IntegrationsActions_disconnect(
  fetch: IIntegrationsFetch,
  provider: IIntegrationProvider,
  syncKey: string
): Promise<void> {
  const response = await fetch(`${IntegrationsActions_baseUrl()}/integrations/${provider}/disconnect`, {
    method: "POST",
    headers: { "X-Sync-Key": syncKey },
  });
  if (!response.ok) {
    throw new Error(`Disconnect failed with ${response.status}`);
  }
}

async function runSync(dispatch: IDispatch, integrations: IIntegrations, fetch: IIntegrationsFetch): Promise<void> {
  const syncKey = integrations.syncKey;
  if (!syncKey) {
    return;
  }
  try {
    const fetched = await IntegrationsSync_fetch(
      fetch,
      IntegrationsActions_baseUrl(),
      syncKey,
      integrations.lastSyncTs
    );
    const now = Date.now();
    const entries = fetched.withings ? WithingsData_toEntries(fetched.withings) : [];
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("integrations")
          .recordModify((i) => IntegrationsSync_apply(i, fetched, now)),
        lb<IState>()
          .p("storage")
          .p("stats")
          .recordModify((stats) => WithingsData_addToStats(stats, entries, now)),
      ],
      "Sync connected devices"
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("integrations")
          .recordModify((i) => ({ ...(i ?? IntegrationsSync_empty), lastSyncError: message })),
      ],
      "Sync connected devices failed"
    );
  }
}

/** Fetches new Withings and WHOOP data into storage. A sync already running is reused, not started twice. */
export function IntegrationsActions_sync(
  dispatch: IDispatch,
  integrations: IIntegrations,
  fetch: IIntegrationsFetch
): Promise<void> {
  if (!inFlight) {
    inFlight = runSync(dispatch, integrations, fetch).finally(() => {
      inFlight = undefined;
    });
  }
  return inFlight;
}
