import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

const SYNCING_CALENDAR_LABEL = "Syncing your calendar…";

const isCalendarSyncing = (state: GoogleUiState) =>
  state === "repairing" || state === "IMPORTING" || state === "checking";

export const useCalendarSyncCmdItems = (): {
  items: CommandItem[];
  syncStatus: SyncStatus;
} => {
  const { commandAction, isAvailable, state } = useConnectGoogle();

  if (!isAvailable) {
    return { items: [], syncStatus: null };
  }

  if (isCalendarSyncing(state)) {
    return {
      items: [
        {
          id: "connect-google-calendar",
          label: SYNCING_CALENDAR_LABEL,
          icon: CloudArrowUpIcon,
          iconClassName: "c-sync-icon-wave",
          disabled: true,
        },
      ],
      syncStatus: getGoogleSyncStatus(state),
    };
  }

  return {
    items: commandAction
      ? [
          {
            id: "connect-google-calendar",
            label: commandAction.label,
            icon: commandAction.icon,
            onClick: commandAction.onSelect,
            ...(state === "ATTENTION" ? { keepOpen: true } : {}),
          },
        ]
      : [],
    syncStatus: getGoogleSyncStatus(state),
  };
};
