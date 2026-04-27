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
}

export function resetBackendAvailabilityForTests(): void {
  isBackendUnavailableFlag = false;
}
