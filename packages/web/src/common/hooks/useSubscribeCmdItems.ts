import { type JsonStructureItem } from "react-cmdk";
import { useSession } from "@web/auth/compass/session/useSession";
import {
  selectUserMetadata,
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { UserApi } from "@web/common/apis/user.api";

/**
 * Returns a command palette item to opt in to email updates.
 * One-way: hidden once subscribed. Unsubscribing happens via the
 * email's own footer link, not from within Compass.
 */
export const useSubscribeCmdItems = (): JsonStructureItem[] => {
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
      children: "Subscribe to Updates",
      icon: "BellIcon",
      onClick: () => {
        void UserApi.updateMetadata({ subscribeToUpdates: true }).then(
          userMetadataActions.set,
        );
      },
    },
  ];
};
