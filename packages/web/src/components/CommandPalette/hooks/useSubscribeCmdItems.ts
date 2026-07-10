import { BellIcon } from "@phosphor-icons/react";
import { UserApi } from "@web/api/user.api";
import { useSession } from "@web/auth/compass/session/useSession";
import {
  selectUserMetadata,
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { SUBSCRIBE_TO_UPDATES_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Returns a command palette item to opt in to email updates.
 * One-way: hidden once subscribed. Unsubscribing happens via the
 * email's own footer link, not from within Compass.
 */
export const useSubscribeCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();
  const subscribed = useUserMetadataStore(
    (state) => selectUserMetadata(state)?.subscribeToUpdates ?? false,
  );

  if (!authenticated || subscribed) {
    return [];
  }

  return [
    {
      id: "subscribe-to-updates",
      label: "Subscribe to Updates",
      icon: BellIcon,
      onClick: () => {
        UserApi.updateMetadata({ subscribeToUpdates: true })
          .then((metadata) => {
            userMetadataActions.set(metadata);
            showStatusToast(
              SUBSCRIBE_TO_UPDATES_TOAST_ID,
              "Subscribed to updates",
            );
          })
          .catch(() => {
            showErrorToast("Couldn't subscribe to updates. Please try again.", {
              toastId: SUBSCRIBE_TO_UPDATES_TOAST_ID,
            });
          });
      },
    },
  ];
};
