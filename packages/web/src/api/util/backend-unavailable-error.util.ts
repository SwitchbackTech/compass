import { useSyncExternalStore } from "react";
import { Status } from "@core/errors/status.codes";
import { createExternalStore } from "@web/common/utils/external-store.util";
import { refreshEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { type ApiError } from "../api.types";

/**
 * Statuses a proxy returns when it cannot reach the backend, or cannot get a
 * timely answer from it. A 500 is excluded on purpose: the backend answered,
 * so it is up and the failure belongs to the individual request.
 */
const BACKEND_DOWN_STATUSES: number[] = [
  Status.BAD_GATEWAY,
  Status.SERVICE_UNAVAILABLE,
  Status.GATEWAY_TIMEOUT,
];

const unavailableStore = createExternalStore(false);

export function isBackendUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "ApiError") {
    // Read the status off the response rather than the message: `createApiError`
    // bakes the status into the message text, and string-matching that is what
    // previously let real 502s through as ordinary request failures.
    const status = (error as ApiError).response?.status;
    // No response at all means the request never reached the backend.
    return status === undefined || BACKEND_DOWN_STATUSES.includes(status);
  }

  return error.message === "Failed to fetch";
}

export function isBackendUnavailable(): boolean {
  return unavailableStore.get();
}

/**
 * React hook: subscribe to backend availability so the UI can render off it.
 */
export function useIsBackendUnavailable(): boolean {
  return useSyncExternalStore(unavailableStore.subscribe, unavailableStore.get);
}

export function markBackendAvailable(): void {
  // Runs on every successful request, so only do the transition work when the
  // flag actually flips; the repository source only needs re-keying then.
  if (!unavailableStore.get()) return;

  unavailableStore.set(false);
  // Source flips back to "remote"; re-key active queries.
  refreshEventRepositorySource();
}

export function markBackendUnavailable(): void {
  unavailableStore.set(true);
  // Source flips to "local" once the backend is unavailable; re-key active queries.
  refreshEventRepositorySource();
}

export function resetBackendAvailabilityForTests(): void {
  unavailableStore.set(false);
}
