import { isBackendUnavailableError } from "@web/common/apis/util/backend-unavailable-error.util";

export function getAuthSubmitErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof Error) {
    if (isBackendUnavailableError(error)) {
      return "Unable to reach the Compass server. Check that your backend is running and try again.";
    }

    return error.message;
  }

  return fallbackMessage;
}
