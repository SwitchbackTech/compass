import { useSyncExternalStore } from "react";
import { AuthApi } from "@web/api/auth.api";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";

type Listener = () => void;

// One browser-wide refresh owns the enqueue request and metadata recheck. This
// prevents the sidebar, delayed toast, and focus hook from racing each other
// while still letting every caller react to the same success or failure.
export const createGoogleSyncRefreshCoordinator = (
  requestRefresh: () => Promise<void>,
) => {
  const listeners = new Set<Listener>();
  let inFlight: Promise<void> | null = null;

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight;

    const request = requestRefresh();
    inFlight = request;
    emit();
    void request.then(
      () => {
        if (inFlight !== request) return;
        inFlight = null;
        emit();
      },
      () => {
        if (inFlight !== request) return;
        inFlight = null;
        emit();
      },
    );
    return request;
  };

  return {
    refresh,
    getIsRefreshing: () => inFlight !== null,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const coordinator = createGoogleSyncRefreshCoordinator(async () => {
  await AuthApi.refreshGoogleSync();
  await refreshUserMetadata({ force: true });
});

export const refreshGoogleSync = () => coordinator.refresh();

export const useIsGoogleSyncRefreshInFlight = () =>
  useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getIsRefreshing,
    coordinator.getIsRefreshing,
  );
