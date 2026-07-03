import { refreshEventRepositorySource } from "@web/common/repositories/event/event.repository.source.store";

let isBackendUnavailableFlag = false;

export function isBackendUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    (error.name === "ApiError" && error.message === "Request failed") ||
    error.message === "Failed to fetch"
  );
}

export function isBackendUnavailable(): boolean {
  return isBackendUnavailableFlag;
}

export function markBackendAvailable(): void {
  isBackendUnavailableFlag = false;
}

export function markBackendUnavailable(): void {
  isBackendUnavailableFlag = true;
  // Source flips to "local" once the backend is unavailable; re-key active queries.
  refreshEventRepositorySource();
}

export function resetBackendAvailabilityForTests(): void {
  isBackendUnavailableFlag = false;
}
