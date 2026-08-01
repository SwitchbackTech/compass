import { ArrowsClockwiseIcon, CloudArrowUpIcon } from "@phosphor-icons/react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import {
  type CommandActionIcon,
  type GoogleUiConfig,
  type GoogleUiState,
} from "./useConnectGoogle.types";

const CONNECT_ICON: CommandActionIcon = CloudArrowUpIcon;
const REFRESH_ICON: CommandActionIcon = ArrowsClockwiseIcon;
const CONNECTED_STATUS: SyncStatus = {
  variant: "healthy",
  text: "Calendar connected",
};
const DELAYED_STATUS: SyncStatus = {
  variant: "warning",
  text: "Calendar updates are taking longer than usual. We'll keep trying.",
};

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
    return "Updated just now";
  }

  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return deltaMin === 1
      ? "Updated 1 minute ago"
      : `Updated ${deltaMin} minutes ago`;
  }

  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) {
    return deltaHr === 1
      ? "Updated 1 hour ago"
      : `Updated ${deltaHr} hours ago`;
  }

  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay < 7) {
    return deltaDay === 1
      ? "Updated 1 day ago"
      : `Updated ${deltaDay} days ago`;
  }

  return `Updated ${new Date(syncedMs).toLocaleDateString()}`;
};

export type GoogleConnectionHandlers = {
  onConnectGoogle: () => void;
  onRefreshGoogle: () => void;
};

export const getGoogleConnectionConfig = (
  state: GoogleUiState,
  handlers: GoogleConnectionHandlers,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
    case "IMPORTING":
    case "HEALTHY":
      return { commandAction: null };
    // Soft Sync failures still get a Refresh CTA — even permanent conflicts
    // benefit from a catch-up attempt plus clearer copy than a dead-end.
    case "ATTENTION":
      return {
        commandAction: {
          label: "Refresh calendar",
          icon: REFRESH_ICON,
          onSelect: handlers.onRefreshGoogle,
        },
      };
    case "NOT_CONNECTED":
      return {
        commandAction: {
          label: "Connect Google Calendar",
          icon: CONNECT_ICON,
          onSelect: handlers.onConnectGoogle,
        },
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: CONNECT_ICON,
          onSelect: handlers.onConnectGoogle,
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
  // A connection summary describes durable provider work. Local metadata
  // loading and a routine incremental pull must not replace a calm, usable
  // calendar with transient "checking" or "syncing" copy.
  if (connection) {
    switch (connection.state) {
      case "healthy":
        return CONNECTED_STATUS;
      case "connecting":
      case "importing":
      case "catchingUp":
        return connection.lastHealthyAt
          ? CONNECTED_STATUS
          : { variant: "syncing", text: "Adding your calendar…" };
      case "delayed":
        return DELAYED_STATUS;
      case "actionRequired":
      case "disconnected":
        // Product enum already distinguishes reconnect vs soft attention.
        break;
    }
  }

  switch (state) {
    case "checking":
      return null;
    case "IMPORTING":
      return { variant: "syncing", text: "Adding your calendar…" };
    case "HEALTHY":
      return CONNECTED_STATUS;
    case "ATTENTION":
      return DELAYED_STATUS;
    case "RECONNECT_REQUIRED":
      return { variant: "error", text: "Calendar needs reconnecting" };
    case "NOT_CONNECTED":
      return null;
  }
};
