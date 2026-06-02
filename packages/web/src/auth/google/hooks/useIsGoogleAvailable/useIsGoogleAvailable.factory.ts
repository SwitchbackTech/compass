import { useEffect, useSyncExternalStore } from "react";

type BackendGoogleAvailability = "available" | "unavailable" | "unknown";

type GoogleAvailabilityDependencies = {
  getConfig: () => Promise<{ google?: { isConfigured?: boolean } }>;
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

  const subscribeToBackendGoogleAvailability = (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const getBackendGoogleAvailabilitySnapshot = (): boolean =>
    backendGoogleAvailability === "available";

  const loadBackendGoogleAvailability = async (): Promise<void> => {
    if (!isGoogleAuthConfigured) {
      setBackendGoogleAvailability("unavailable");
      return;
    }

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
      subscribeToBackendGoogleAvailability,
      getBackendGoogleAvailabilitySnapshot,
      getBackendGoogleAvailabilitySnapshot,
    );

    useEffect(() => {
      void loadBackendGoogleAvailability();
    }, []);

    return isGoogleAuthConfigured && isBackendGoogleConfigured;
  };

  const resetGoogleAvailabilityForTests = () => {
    backendGoogleAvailability = "unknown";
    loadPromise = undefined;
    emit();
  };

  return {
    resetGoogleAvailabilityForTests,
    useIsGoogleAvailable,
  };
}
