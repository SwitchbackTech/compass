const POPUP_CLOSED_ERROR_TYPE = "popup_closed";
const POPUP_CLOSED_ERROR_MESSAGE = "popup window closed";
const POPUP_OPEN_FAILED_MESSAGE = "failed to open popup window";

type GoogleOAuthErrorLike = {
  type?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
};

export const isGooglePopupClosedError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeGoogleError = error as GoogleOAuthErrorLike;

  if (maybeGoogleError.type === POPUP_CLOSED_ERROR_TYPE) {
    return true;
  }

  const errorMessages = [
    maybeGoogleError.error,
    maybeGoogleError.error_description,
    maybeGoogleError.message,
  ].filter((value): value is string => typeof value === "string");

  return errorMessages.some(
    (value) =>
      value.toLowerCase() === POPUP_CLOSED_ERROR_TYPE ||
      value.toLowerCase().includes(POPUP_CLOSED_ERROR_MESSAGE) ||
      value.toLowerCase().includes(POPUP_OPEN_FAILED_MESSAGE),
  );
};
