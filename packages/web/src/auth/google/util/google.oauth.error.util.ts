const POPUP_CLOSED_ERROR_TYPE = "popup_closed";
const POPUP_ERROR_MESSAGE_FRAGMENTS = [
  "popup window closed",
  "failed to open popup window",
];

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
      POPUP_ERROR_MESSAGE_FRAGMENTS.some((fragment) =>
        value.toLowerCase().includes(fragment),
      ),
  );
};
