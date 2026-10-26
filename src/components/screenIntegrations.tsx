import { JSX, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { Button } from "./button";
import { LinkButton } from "./linkButton";
import { IIntegrations } from "../types";
import { Dialog_confirm } from "../utils/dialog";
import { DateUtils_format } from "../utils/date";
import { IIntegrationProvider, IIntegrationsStatus } from "../models/integrationsSync";
import {
  IntegrationsActions_connectUrl,
  IntegrationsActions_disconnect,
  IntegrationsActions_setSyncKey,
  IntegrationsActions_status,
  IntegrationsActions_sync,
} from "../models/integrationsActions";
import {
  IntegrationsSummary_bodyRows,
  IntegrationsSummary_latestBody,
  IntegrationsSummary_recoveryColor,
  IntegrationsSummary_weekLine,
  IntegrationsSummary_whoopDayRows,
  IntegrationsSummary_workoutLine,
} from "../models/integrationsSummary";

interface IProps {
  dispatch: IDispatch;
  integrations?: IIntegrations;
}

const providerNames: Record<IIntegrationProvider, string> = { whoop: "WHOOP", withings: "Withings" };
const recoveryColors = { green: "#16a34a", yellow: "#ca8a04", red: "#dc2626" };

export function ScreenIntegrations(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Connected Devices" });
  const syncKey = props.integrations?.syncKey;
  const [status, setStatus] = useState<IIntegrationsStatus | undefined>(undefined);
  const [statusError, setStatusError] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshStatus = (): void => {
    if (!syncKey) {
      return;
    }
    IntegrationsActions_status(fetch, syncKey)
      .then((s) => {
        setStatus(s);
        setStatusError(undefined);
      })
      .catch((e: Error) => setStatusError(e.message));
  };
  useEffect(refreshStatus, [syncKey]);

  const days = props.integrations?.whoopDays ?? [];
  const latestDay = days[0];
  const latestBody = IntegrationsSummary_latestBody(props.integrations);
  const color = IntegrationsSummary_recoveryColor(latestDay?.recoveryScore);

  return (
    <View className="px-gutter pb-8">
      <Text className="pt-2 text-sm text-text-secondary">
        Lyteweight reads your WHOOP and Withings data through its own server on Cloudflare. Set the sync key you saved
        there as SYNC_KEY, then connect each service.
      </Text>

      <GroupHeader name="Setup" topPadding={true} />
      <MenuItemEditable
        type="text"
        name="Sync key"
        value={syncKey ?? ""}
        onChange={(v) => IntegrationsActions_setSyncKey(props.dispatch, v ?? "")}
      />
      {statusError && <Text className="py-2 text-sm text-text-error">{statusError}</Text>}
      {(["whoop", "withings"] as const).map((provider) => (
        <MenuItem
          key={provider}
          name={providerNames[provider]}
          value={
            !syncKey || !status ? (
              "-"
            ) : !status.configured[provider] ? (
              <Text className="text-sm text-text-secondary">Not set up in Cloudflare</Text>
            ) : status[provider] ? (
              <LinkButton
                name={`disconnect-${provider}`}
                onClick={async () => {
                  if (await Dialog_confirm(`Disconnect ${providerNames[provider]}?`)) {
                    IntegrationsActions_disconnect(fetch, provider, syncKey)
                      .then(refreshStatus)
                      .catch((e: Error) => setStatusError(e.message));
                  }
                }}
              >
                Connected · Disconnect
              </LinkButton>
            ) : (
              <LinkButton
                name={`connect-${provider}`}
                onClick={() => Linking.openURL(IntegrationsActions_connectUrl(provider, syncKey))}
              >
                Connect
              </LinkButton>
            )
          }
        />
      ))}

      <View className="items-center pt-4">
        <Button
          name="integrations-sync-now"
          kind="purple"
          disabled={!syncKey || isSyncing}
          onClick={() => {
            if (props.integrations) {
              setIsSyncing(true);
              IntegrationsActions_sync(props.dispatch, props.integrations, fetch).finally(() => setIsSyncing(false));
            }
          }}
        >
          {isSyncing ? "Syncing…" : "Sync now"}
        </Button>
        <Text className="pt-2 text-xs text-text-secondary">
          {props.integrations?.lastSyncTs
            ? `Last synced ${DateUtils_format(props.integrations.lastSyncTs)}`
            : "Not synced yet"}
        </Text>
        {props.integrations?.lastSyncError && (
          <Text className="pt-1 text-xs text-center text-text-error">{props.integrations.lastSyncError}</Text>
        )}
      </View>

      {latestDay && (
        <View>
          <GroupHeader name={`WHOOP · ${latestDay.date}`} topPadding={true} />
          {IntegrationsSummary_whoopDayRows(latestDay).map((row) => (
            <MenuItem
              key={row.name}
              name={row.name}
              value={
                row.name === "Recovery" && color ? (
                  <Text style={{ color: recoveryColors[color], fontWeight: "700" }}>{row.value}</Text>
                ) : (
                  row.value
                )
              }
            />
          ))}
          <GroupHeader name="Last 7 days" topPadding={true} />
          {days.slice(0, 7).map((day) => (
            <MenuItem key={day.cycleId} name={day.date} value={IntegrationsSummary_weekLine(day)} />
          ))}
        </View>
      )}

      {(props.integrations?.whoopWorkouts ?? []).length > 0 && (
        <View>
          <GroupHeader name="Recent WHOOP workouts" topPadding={true} />
          {(props.integrations?.whoopWorkouts ?? []).slice(0, 7).map((workout) => (
            <MenuItem
              key={workout.id}
              name={`${DateUtils_format(workout.start)} · ${workout.sport ?? "Workout"}`}
              value={IntegrationsSummary_workoutLine(workout)}
            />
          ))}
        </View>
      )}

      {latestBody && (
        <View>
          <GroupHeader name={`Withings · ${DateUtils_format(latestBody.timestamp)}`} topPadding={true} />
          {IntegrationsSummary_bodyRows(latestBody).map((row) => (
            <MenuItem key={row.name} name={row.name} value={row.value} />
          ))}
        </View>
      )}
    </View>
  );
}
