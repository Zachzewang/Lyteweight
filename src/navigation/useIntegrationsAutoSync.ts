import { useEffect } from "react";
import { IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { IntegrationsSync_isDue } from "../models/integrationsSync";
import { IntegrationsActions_sync } from "../models/integrationsActions";

/** Pulls new WHOOP and Withings data when the app opens and whenever the sync key changes. */
export function useIntegrationsAutoSync(state: IState, dispatch: IDispatch): void {
  const integrations = state.storage.integrations;
  useEffect(() => {
    if (integrations && IntegrationsSync_isDue(integrations, Date.now())) {
      IntegrationsActions_sync(dispatch, integrations, fetch).catch(() => undefined);
    }
  }, [integrations?.syncKey]);
}
