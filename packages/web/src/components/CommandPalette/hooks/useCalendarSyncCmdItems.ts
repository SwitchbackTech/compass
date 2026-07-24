import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import {
  selectGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { type SyncStatus } from "@web/calendars/sync-status.types";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

export const useCalendarSyncCmdItems = (): {
  items: CommandItem[];
  syncStatus: SyncStatus;
} => {
  const { commandAction, isAvailable, state } = useConnectGoogle();
  const syncConnection = useUserMetadataStore(selectGoogleSyncConnection);
  const syncStatus = getGoogleSyncStatus(state, syncConnection);

  if (!isAvailable) {
    return { items: [], syncStatus: null };
  }

  if (syncStatus?.variant === "syncing") {
    return {
      items: [
        {
          id: "connect-google-calendar",
          label: syncStatus.text,
          icon: CloudArrowUpIcon,
          iconClassName: "c-sync-icon-wave",
          disabled: true,
        },
      ],
      syncStatus,
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
    syncStatus,
  };
};
