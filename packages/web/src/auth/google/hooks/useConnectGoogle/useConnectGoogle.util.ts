import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import {
  type CommandActionIcon,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const COMMAND_ICON: CommandActionIcon = CloudArrowUpIcon;

/** Short relative label for Sync connection `lastSyncedAt` (ISO). */
export const formatLastSyncedLabel = (
  lastSyncedAt: string | null | undefined,
  nowMs: number = Date.now(),
): string | null => {
  if (!lastSyncedAt) {
    return null;
  }

  const syncedMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedMs)) {
    return null;
  }

  const deltaSec = Math.max(0, Math.floor((nowMs - syncedMs) / 1000));
  if (deltaSec < 60) {
    return "Last synced just now";
  }

  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return deltaMin === 1
      ? "Last synced 1 minute ago"
      : `Last synced ${deltaMin} minutes ago`;
  }

  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) {
    return deltaHr === 1
      ? "Last synced 1 hour ago"
      : `Last synced ${deltaHr} hours ago`;
  }

  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay < 7) {
    return deltaDay === 1
      ? "Last synced 1 day ago"
      : `Last synced ${deltaDay} days ago`;
  }

  return `Last synced ${new Date(syncedMs).toLocaleDateString()}`;
};

export const getGoogleConnectionConfig = (
  state: GoogleUiState,
  onConnectGoogle: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
    case "repairing":
    case "IMPORTING":
    case "HEALTHY":
    // ATTENTION means a Sync outage or a permanent conflict; no client
    // action can fix either, so it also renders no command action.
    case "ATTENTION":
      return { commandAction: null };
    case "NOT_CONNECTED":
      return {
        commandAction: {
          label: "Connect Google Calendar",
          icon: COMMAND_ICON,
          onSelect: onConnectGoogle,
        },
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: COMMAND_ICON,
          onSelect: onConnectGoogle,
        },
      };
  }
};

// Prefer Sync vocabulary when a connection summary is present; fall back to the
// collapsed product enum for legacy deployments.
export const getGoogleSyncStatus = (
  state: GoogleUiState,
  connection?: GoogleSyncConnectionSummary | null,
): SyncStatus => {
  if (connection) {
    switch (connection.state) {
      case "healthy":
        return { variant: "healthy", text: "Calendar up-to-date" };
      case "connecting":
      case "importing":
        return { variant: "syncing", text: "Syncing your calendar…" };
      case "catchingUp":
        return { variant: "syncing", text: "Catching up your calendar…" };
      case "delayed":
        return { variant: "warning", text: "Calendar sync is delayed" };
      case "actionRequired":
      case "disconnected":
        // Product enum already distinguishes reconnect vs soft attention.
        break;
    }
  }

  switch (state) {
    case "HEALTHY":
      return { variant: "healthy", text: "Calendar up-to-date" };
    case "IMPORTING":
    case "repairing":
    case "checking":
      return { variant: "syncing", text: "Syncing your calendar…" };
    case "ATTENTION":
      return { variant: "warning", text: "Calendar is out of date" };
    case "RECONNECT_REQUIRED":
      return { variant: "error", text: "Calendar needs reconnecting" };
    case "NOT_CONNECTED":
      return null;
  }
};
