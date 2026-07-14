import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

export const useCalendarSyncCmdItems = (): {
  items: CommandItem[];
  syncStatus: SyncStatus;
} => {
  const { commandAction, isAvailable, state } = useConnectGoogle();

  if (!isAvailable) {
    return { items: [], syncStatus: null };
  }

  return {
    items: commandAction
      ? [
          {
            id: "connect-google-calendar",
            label: commandAction.label,
            icon: commandAction.icon,
            disabled: commandAction.isDisabled,
            onClick: commandAction.onSelect,
          },
        ]
      : [],
    syncStatus: getGoogleSyncStatus(state),
  };
};
