import { useEffect, useSyncExternalStore } from "react";
import { AppConfigApi } from "@web/common/apis/app-config.api";
import { IS_GOOGLE_AUTH_CONFIGURED } from "@web/common/constants/env.constants";

type BackendGoogleAvailability = "available" | "unavailable" | "unknown";

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
  if (!IS_GOOGLE_AUTH_CONFIGURED) {
    setBackendGoogleAvailability("unavailable");
    return;
  }

  if (!loadPromise) {
    loadPromise = AppConfigApi.get()
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

export const useIsGoogleAvailable = (): boolean => {
  const isBackendGoogleConfigured = useSyncExternalStore(
    subscribeToBackendGoogleAvailability,
    getBackendGoogleAvailabilitySnapshot,
    getBackendGoogleAvailabilitySnapshot,
  );

  useEffect(() => {
    void loadBackendGoogleAvailability();
  }, []);

  return IS_GOOGLE_AUTH_CONFIGURED && isBackendGoogleConfigured;
};

export const resetGoogleAvailabilityForTests = () => {
  backendGoogleAvailability = "unknown";
  loadPromise = undefined;
  emit();
};
