import { useCallback } from "react";
import { type GoogleConnectionState } from "@core/types/user.types";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { hasUserEverAuthenticated } from "@web/auth/state/auth.state.util";
import { SyncApi } from "@web/common/apis/sync.api";
import {
  selectGoogleConnectionState,
  selectUserMetadataStatus,
} from "@web/ducks/auth/selectors/user-metadata.selectors";
import type { UserMetadataStatus } from "@web/ducks/auth/slices/user-metadata.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import type { RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

/**
 * UI state for Google Calendar connection.
 * "checking" is a client-only state for loading, the rest map directly
 * to GoogleConnectionState from the server.
 */
type GoogleUiState = "checking" | GoogleConnectionState;

type SidebarStatusIcon =
  | "CloudArrowUpIcon"
  | "LinkBreakIcon"
  | "LinkIcon"
  | "SpinnerIcon"
  | "CloudWarningIcon";

type CommandActionIcon = "CloudArrowUpIcon";

type GoogleUiConfig = {
  commandAction: {
    label: string;
    icon: CommandActionIcon;
    isDisabled: boolean;
    onSelect?: () => void;
  };
  sidebarStatus: {
    icon: SidebarStatusIcon;
    tooltip: string;
    isDisabled: boolean;
    onSelect?: () => void;
  };
};

const COMMAND_ICON: CommandActionIcon = "CloudArrowUpIcon";

const getGoogleUiConfig = (
  state: GoogleUiState,
  onConnectGoogle: () => void,
  onRepairGoogle: () => void,
  onRepairGoogleFromSidebar: () => void,
): GoogleUiConfig => {
  switch (state) {
    case "checking":
      return {
        commandAction: {
          label: "Checking Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Checking Google Calendar status…",
          isDisabled: true,
        },
      };
    case "NOT_CONNECTED":
      return {
        commandAction: {
          label: "Connect Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
        sidebarStatus: {
          icon: "CloudArrowUpIcon",
          tooltip: "Google Calendar not connected. Click to connect.",
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "RECONNECT_REQUIRED":
      return {
        commandAction: {
          label: "Reconnect Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
        sidebarStatus: {
          icon: "LinkBreakIcon",
          tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
          isDisabled: false,
          onSelect: onConnectGoogle,
        },
      };
    case "IMPORTING":
      return {
        commandAction: {
          label: "Syncing Google Calendar…",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "SpinnerIcon",
          tooltip: "Google Calendar is syncing in the background.",
          isDisabled: true,
        },
      };
    case "ATTENTION":
      return {
        commandAction: {
          label: "Repair Google Calendar",
          icon: COMMAND_ICON,
          isDisabled: false,
          onSelect: onRepairGoogle,
        },
        sidebarStatus: {
          icon: "CloudWarningIcon",
          tooltip: "Google Calendar needs repair. Click to repair.",
          isDisabled: false,
          onSelect: onRepairGoogleFromSidebar,
        },
      };
    case "HEALTHY":
      return {
        commandAction: {
          label: "Google Calendar Connected",
          icon: COMMAND_ICON,
          isDisabled: true,
        },
        sidebarStatus: {
          icon: "LinkIcon",
          tooltip: "Google Calendar connected.",
          isDisabled: true,
        },
      };
  }
};

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const connectionState = useAppSelector(
    selectGoogleConnectionState as (state: RootState) => GoogleConnectionState,
  );
  const userMetadataStatus = useAppSelector(
    selectUserMetadataStatus as (state: RootState) => UserMetadataStatus,
  );
  const { login } = useGoogleAuth({
    prompt: "consent",
    shouldTryLinkingWithSessionUser: true,
  });

  const onOpenGoogleAuth = useCallback(() => {
    void login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const onRepairGoogleCalendarBase = useCallback(() => {
    const run = async () => {
      dispatch(importGCalSlice.actions.clearImportResults(undefined));
      try {
        await SyncApi.importGCal({ force: true });
      } catch (error) {
        console.error("Failed to start Google Calendar repair:", error);
        dispatch(
          importGCalSlice.actions.setImportError(
            "Failed to start Google Calendar repair.",
          ),
        );
      }
    };
    void run();
  }, [dispatch]);

  const onRepairGoogleCalendar = useCallback(() => {
    dispatch(settingsSlice.actions.closeCmdPalette());
    onRepairGoogleCalendarBase();
  }, [dispatch, onRepairGoogleCalendarBase]);

  const onRepairGoogleCalendarFromSidebar = useCallback(() => {
    onRepairGoogleCalendarBase();
  }, [onRepairGoogleCalendarBase]);

  // "checking" is a UI-only state until we have loaded metadata from the server.
  // Covers both "idle" (before refreshUserMetadata dispatches setLoading) and
  // "loading" so returning users do not briefly see NOT_CONNECTED from the selector default.
  const isCheckingStatus =
    hasUserEverAuthenticated() && userMetadataStatus !== "loaded";

  const state: GoogleUiState = isCheckingStatus ? "checking" : connectionState;

  return getGoogleUiConfig(
    state,
    onOpenGoogleAuth,
    onRepairGoogleCalendar,
    onRepairGoogleCalendarFromSidebar,
  );
};
