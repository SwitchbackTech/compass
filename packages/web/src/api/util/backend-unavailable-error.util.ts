import { useSyncExternalStore } from "react";
import { Status } from "@core/errors/status.codes";
import { EventMutationErrorSchema } from "@core/types/event-command.contracts";
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

/**
 * The backend answers PROVIDER_FAILURE with a 502 (event.error.ts), so a
 * gateway status alone doesn't mean it's unreachable. A body in the mutation
 * error shape can only have come from the backend itself - a proxy that
 * couldn't reach it has no way to write one - which puts it under the same
 * rule as the 500 above: it answered, so the failure is this request's.
 */
function isBackendAuthoredError(data: unknown): boolean {
  return EventMutationErrorSchema.safeParse(data).success;
}

/**
 * Chromium: "Failed to fetch". Firefox: "NetworkError when attempting to
 * fetch resource." Both mean the browser never got an HTTP response.
 */
export function isTransientBrowserNetworkMessage(message: string): boolean {
  return (
    message === "Failed to fetch" ||
    message === "NetworkError when attempting to fetch resource."
  );
}

export function isBackendUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "ApiError") {
    // Read the status off the response rather than the message: `createApiError`
    // bakes the status into the message text, and string-matching that is what
    // previously let real 502s through as ordinary request failures.
    const response = (error as ApiError).response;
    // No response at all means the request never reached the backend.
    if (response === undefined) return true;
    if (!BACKEND_DOWN_STATUSES.includes(response.status)) return false;

    return !isBackendAuthoredError(response.data);
  }

  return isTransientBrowserNetworkMessage(error.message);
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
