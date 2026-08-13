import { useEffect } from "react";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";

const TRANSIENT_CONNECTION_STATES = new Set([
  "connecting",
  "importing",
  "catchingUp",
]);
const TRANSIENT_POLL_MS = 20_000;

/**
 * While any single connection (not the aggregate) is still connecting,
 * importing, or catching up, force-refresh metadata every 20s. Each poll is
 * also a server-side re-derivation because the sync read path refreshes
 * state. Stops when nothing is transient.
 */
export const useTransientSyncPolling = () => {
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const anyTransient = connections.some((connection) =>
    TRANSIENT_CONNECTION_STATES.has(connection.state),
  );

  useEffect(() => {
    if (!anyTransient) return;
    const id = setInterval(() => {
      void refreshUserMetadata({ force: true });
    }, TRANSIENT_POLL_MS);
    return () => clearInterval(id);
  }, [anyTransient]);
};
