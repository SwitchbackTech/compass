import { useEffect, useSyncExternalStore } from "react";

type BackendGoogleAvailability = "available" | "unavailable" | "unknown";

type AppConfigResponse = {
  google?: { isConfigured?: boolean; connectDelegatedToSync?: boolean };
};

type GoogleAvailabilityDependencies = {
  getConfig: () => Promise<AppConfigResponse>;
  isGoogleAuthConfigured: boolean;
};

export function createGoogleAvailability({
  getConfig,
  isGoogleAuthConfigured,
}: GoogleAvailabilityDependencies) {
  const listeners = new Set<() => void>();
  let backendGoogleAvailability: BackendGoogleAvailability = "unknown";
  // Deployment posture: does the backend delegate Google connections to the
  // sync service (redirect flow) instead of the legacy code-exchange flow?
  // Loaded from the same /config response; false until known, so the connect
  // UX stays on the legacy path unless delegation is confirmed on.
  let connectDelegatedToSync = false;
  let loadPromise: Promise<void> | undefined;

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setBackendGoogleAvailability = (
    availability: BackendGoogleAvailability,
  ) => {
    backendGoogleAvailability = availability;
    emit();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const getBackendGoogleAvailabilitySnapshot = (): boolean =>
    backendGoogleAvailability === "available";

  const getConnectDelegatedToSyncSnapshot = (): boolean =>
    connectDelegatedToSync;

  const loadBackendGoogleAvailability = async (): Promise<void> => {
    // Always fetch /config, even without a baked GOOGLE_CLIENT_ID: a
    // sync-delegated connect flow needs no client-side id at all, so bailing
    // out here would leave connectDelegatedToSync permanently unknown for
    // exactly the deployments that need it (e.g. a self-host web image that
    // hasn't rebuilt with its own client id). Sign-in availability still
    // requires the baked id — see useIsGoogleAvailable below.
    if (!loadPromise) {
      loadPromise = getConfig()
        .then((config) => {
          connectDelegatedToSync =
            config.google?.connectDelegatedToSync ?? false;
          setBackendGoogleAvailability(
            config.google?.isConfigured ? "available" : "unavailable",
          );
        })
        .catch(() => {
          loadPromise = undefined;
          connectDelegatedToSync = false;
          setBackendGoogleAvailability("unavailable");
        });
    }

    return loadPromise;
  };

  const useIsGoogleAvailable = (): boolean => {
    const isBackendGoogleConfigured = useSyncExternalStore(
      subscribe,
      getBackendGoogleAvailabilitySnapshot,
      getBackendGoogleAvailabilitySnapshot,
    );

    useEffect(() => {
      void loadBackendGoogleAvailability();
    }, []);

    return isGoogleAuthConfigured && isBackendGoogleConfigured;
  };

  // Connect-calendar availability, distinct from sign-in (useIsGoogleAvailable
  // above): the sync redirect flow (connectDelegatedToSync) never runs
  // client-side code exchange, so it needs no baked GOOGLE_CLIENT_ID — only
  // that the backend has Google configured at all. The legacy popup flow
  // still needs the baked id, same as sign-in.
  const useIsConnectGoogleAvailable = (): boolean => {
    const isBackendGoogleConfigured = useSyncExternalStore(
      subscribe,
      getBackendGoogleAvailabilitySnapshot,
      getBackendGoogleAvailabilitySnapshot,
    );
    const delegatedToSync = useSyncExternalStore(
      subscribe,
      getConnectDelegatedToSyncSnapshot,
      getConnectDelegatedToSyncSnapshot,
    );

    useEffect(() => {
      void loadBackendGoogleAvailability();
    }, []);

    return (
      isBackendGoogleConfigured && (delegatedToSync || isGoogleAuthConfigured)
    );
  };

  const useIsConnectDelegatedToSync = (): boolean => {
    const delegated = useSyncExternalStore(
      subscribe,
      getConnectDelegatedToSyncSnapshot,
      getConnectDelegatedToSyncSnapshot,
    );

    useEffect(() => {
      void loadBackendGoogleAvailability();
    }, []);

    return delegated;
  };

  const resetGoogleAvailabilityForTests = () => {
    backendGoogleAvailability = "unknown";
    connectDelegatedToSync = false;
    loadPromise = undefined;
    emit();
  };

  /** Pins availability for tests and skips the config fetch. */
  const setGoogleAvailabilityForTests = (
    availability: BackendGoogleAvailability,
  ) => {
    backendGoogleAvailability = availability;
    loadPromise = Promise.resolve();
    emit();
  };

  /** Pins connect-delegation for tests and skips the config fetch. */
  const setConnectDelegatedToSyncForTests = (delegated: boolean) => {
    connectDelegatedToSync = delegated;
    loadPromise = Promise.resolve();
    emit();
  };

  return {
    resetGoogleAvailabilityForTests,
    setGoogleAvailabilityForTests,
    setConnectDelegatedToSyncForTests,
    useIsGoogleAvailable,
    useIsConnectGoogleAvailable,
    useIsConnectDelegatedToSync,
  };
}
