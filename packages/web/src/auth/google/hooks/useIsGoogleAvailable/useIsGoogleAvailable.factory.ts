import { useEffect, useSyncExternalStore } from "react";

type BackendGoogleAvailability = "available" | "unavailable" | "unknown";

type AppConfigResponse = {
  google?: { isConfigured?: boolean };
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

  const loadBackendGoogleAvailability = async (): Promise<void> => {
    // Always fetch /config, even without a baked GOOGLE_CLIENT_ID: the sync
    // redirect connect flow needs no client-side id at all, so bailing out
    // here would leave connect permanently unavailable for exactly the
    // deployments that need it (e.g. a self-host web image that hasn't
    // rebuilt with its own client id). Sign-in availability still requires
    // the baked id — see useIsGoogleAvailable below.
    if (!loadPromise) {
      loadPromise = getConfig()
        .then((config) => {
          setBackendGoogleAvailability(
            config.google?.isConfigured ? "available" : "unavailable",
          );
        })
        .catch(() => {
          loadPromise = undefined;
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
  // above): the sync redirect flow never runs client-side code exchange, so
  // it needs no baked GOOGLE_CLIENT_ID — only that the backend has Google
  // configured at all.
  const useIsConnectGoogleAvailable = (): boolean => {
    const isBackendGoogleConfigured = useSyncExternalStore(
      subscribe,
      getBackendGoogleAvailabilitySnapshot,
      getBackendGoogleAvailabilitySnapshot,
    );

    useEffect(() => {
      void loadBackendGoogleAvailability();
    }, []);

    return isBackendGoogleConfigured;
  };

  const resetGoogleAvailabilityForTests = () => {
    backendGoogleAvailability = "unknown";
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

  return {
    resetGoogleAvailabilityForTests,
    setGoogleAvailabilityForTests,
    useIsGoogleAvailable,
    useIsConnectGoogleAvailable,
  };
}
