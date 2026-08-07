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

// Plain backlog under this age stays silent in the sidebar and reads as
// connected in Settings. Matches the short provider-error delay band so a
// freshly clicked Refresh does not invent its own warning.
export const CATCHING_UP_NOTICE_AFTER_MS = 2 * 60 * 1000;

const SUPPORT_MAILTO = "mailto:tyler@switchback.tech";

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

/** Mid-sentence form of formatLastSyncedLabel ("Last updated …"). */
export const formatLastUpdatedClause = (
  lastSyncedAt: string | null | undefined,
  nowMs: number = Date.now(),
): string | null => {
  const label = formatLastSyncedLabel(lastSyncedAt, nowMs);
  if (!label) return null;
  return label.replace(/^Updated /, "Last updated ");
};

const syncedAgeMs = (
  lastSyncedAt: string | null | undefined,
  nowMs: number,
): number | null => {
  if (!lastSyncedAt) return null;
  const syncedMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedMs)) return null;
  return Math.max(0, nowMs - syncedMs);
};

export type GoogleConnectionHandlers = {
  onConnectGoogle: () => void;
  onRefreshGoogle: () => void;
};

export type GoogleConnectionConfigOptions = {
  // Refresh was requested and the degraded state did not improve — stop
  // offering the same Refresh button; offer reconnect + support instead.
  refreshGaveUp?: boolean;
};

export const getGoogleConnectionConfig = (
  state: GoogleUiState,
  handlers: GoogleConnectionHandlers,
  options: GoogleConnectionConfigOptions = {},
): GoogleUiConfig => {
  switch (state) {
    case "checking":
    case "IMPORTING":
    case "HEALTHY":
      return { commandAction: null };
    case "ATTENTION":
      if (options.refreshGaveUp) {
        return {
          commandAction: {
            label: "Reconnect Google Calendar",
            icon: CONNECT_ICON,
            onSelect: handlers.onConnectGoogle,
          },
        };
      }
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

const delayedSettingsStatus = (
  connection: GoogleSyncConnectionSummary,
  nowMs: number,
): SyncStatus => {
  const last = formatLastUpdatedClause(connection.lastSyncedAt, nowMs);
  const lastBit = last ? ` ${last}.` : "";
  if (connection.stateReason === "providerErrors") {
    return {
      variant: "warning",
      text: `Sync hit an error.${lastBit} Refresh your calendars, or reconnect if this continues.`,
    };
  }
  return {
    variant: "warning",
    text: `Sync is stuck.${lastBit} Refresh your calendars, or reconnect if this continues.`,
  };
};

const catchingUpSettingsStatus = (
  connection: GoogleSyncConnectionSummary,
  nowMs: number,
): SyncStatus => {
  if (!connection.lastHealthyAt) {
    return { variant: "syncing", text: "Adding your calendar…" };
  }
  const ageMs = syncedAgeMs(connection.lastSyncedAt, nowMs);
  if (ageMs === null || ageMs < CATCHING_UP_NOTICE_AFTER_MS) {
    return CONNECTED_STATUS;
  }
  const last = formatLastUpdatedClause(connection.lastSyncedAt, nowMs);
  const lastBit = last ? ` ${last}.` : "";
  return {
    variant: "syncing",
    text: `Sync is catching up.${lastBit} This usually clears on its own.`,
  };
};

// Prefer Sync vocabulary when a connection summary is present; fall back to the
// collapsed product enum for legacy deployments.
export const getGoogleSyncStatus = (
  state: GoogleUiState,
  connection?: GoogleSyncConnectionSummary | null,
  nowMs: number = Date.now(),
  options: { refreshGaveUp?: boolean } = {},
): SyncStatus => {
  // A connection summary describes durable provider work. Local metadata
  // loading and a routine incremental pull must not replace a calm, usable
  // calendar with transient "checking" or "syncing" copy.
  if (connection) {
    if (options.refreshGaveUp && connection.state === "delayed") {
      const last = formatLastUpdatedClause(connection.lastSyncedAt, nowMs);
      const lastBit = last ? ` ${last}.` : "";
      return {
        variant: "error",
        text: `Sync is stuck.${lastBit} Reconnect your calendar, or email tyler@switchback.tech for help.`,
      };
    }

    switch (connection.state) {
      case "healthy":
        return CONNECTED_STATUS;
      case "connecting":
      case "importing":
        return connection.lastHealthyAt
          ? CONNECTED_STATUS
          : { variant: "syncing", text: "Adding your calendar…" };
      case "catchingUp":
        return catchingUpSettingsStatus(connection, nowMs);
      case "delayed":
        return delayedSettingsStatus(connection, nowMs);
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
      if (options.refreshGaveUp) {
        return {
          variant: "error",
          text: "Sync is stuck. Reconnect your calendar, or email tyler@switchback.tech for help.",
        };
      }
      return {
        variant: "warning",
        text: "Sync is stuck. Refresh your calendars, or reconnect if this continues.",
      };
    case "RECONNECT_REQUIRED":
      return { variant: "error", text: "Calendar needs reconnecting" };
    case "NOT_CONNECTED":
      return null;
  }
};

/**
 * The sidebar's take on one account's status. Two rules the sidebar applies
 * that Settings doesn't: a connect/reconnect that has been clicked but hasn't
 * round-tripped yet wins over the (still pre-click) connection summary, and a
 * healthy account shows nothing at all - the sidebar stays quiet, full detail
 * lives in Settings.
 */
export const getSidebarSyncStatus = ({
  connection,
  isConnecting,
  state,
  nowMs = Date.now(),
  refreshGaveUp = false,
}: {
  connection?: GoogleSyncConnectionSummary | null;
  isConnecting: boolean;
  state: GoogleUiState;
  nowMs?: number;
  refreshGaveUp?: boolean;
}): SyncStatus => {
  if (isConnecting) {
    return {
      variant: "syncing",
      text:
        state === "RECONNECT_REQUIRED"
          ? "Reconnecting your calendar…"
          : "Connecting your calendar…",
    };
  }

  if (
    refreshGaveUp &&
    (state === "ATTENTION" || connection?.state === "delayed")
  ) {
    return { variant: "error", text: "Sync is stuck" };
  }

  if (connection) {
    switch (connection.state) {
      case "catchingUp": {
        if (!connection.lastHealthyAt) {
          return { variant: "syncing", text: "Adding your calendar…" };
        }
        const ageMs = syncedAgeMs(connection.lastSyncedAt, nowMs);
        if (ageMs !== null && ageMs >= CATCHING_UP_NOTICE_AFTER_MS) {
          return { variant: "syncing", text: "Sync is catching up" };
        }
        return null;
      }
      case "delayed":
        return {
          variant: "warning",
          text:
            connection.stateReason === "providerErrors"
              ? "Sync hit an error"
              : "Sync is stuck",
        };
      case "actionRequired":
      case "disconnected":
        return { variant: "error", text: "Calendar needs reconnecting" };
      case "connecting":
      case "importing":
        return connection.lastHealthyAt
          ? null
          : { variant: "syncing", text: "Adding your calendar…" };
      case "healthy":
        return null;
    }
  }

  const status = getGoogleSyncStatus(state, connection, nowMs, {
    refreshGaveUp,
  });
  return status?.variant === "healthy" ? null : status;
};

export const googleSyncSupportMailto = SUPPORT_MAILTO;
