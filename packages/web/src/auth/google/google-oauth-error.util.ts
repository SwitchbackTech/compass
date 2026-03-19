const POPUP_CLOSED_ERROR_TYPE = "popup_closed";
const POPUP_CLOSED_ERROR_MESSAGE = "popup window closed";

type GoogleOAuthErrorLike = {
  type?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
};

const isPopupClosedString = (value: string): boolean => {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue === POPUP_CLOSED_ERROR_TYPE ||
    normalizedValue.includes(POPUP_CLOSED_ERROR_MESSAGE)
  );
};

const isPopupClosedUnknown = (value: unknown): boolean => {
  if (typeof value === "string") {
    return isPopupClosedString(value);
  }

  if (value instanceof Error) {
    return isPopupClosedString(value.message);
  }

  if (value && typeof value === "object" && "message" in value) {
    const objectWithMessage = value as { message?: unknown };
    if (typeof objectWithMessage.message === "string") {
      return isPopupClosedString(objectWithMessage.message);
    }
  }

  return false;
};

export const isGooglePopupClosedError = (error: unknown): boolean => {
  if (isPopupClosedUnknown(error)) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeGoogleError = error as GoogleOAuthErrorLike;
  const possibleErrorValues = [
    maybeGoogleError.type,
    maybeGoogleError.error,
    maybeGoogleError.error_description,
    maybeGoogleError.message,
  ];

  return possibleErrorValues.some(isPopupClosedUnknown);
};
