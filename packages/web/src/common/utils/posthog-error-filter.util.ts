type PostHogEventLike = {
  event?: unknown;
  properties?: Record<string, unknown>;
};

const POSTHOG_EXCEPTION_EVENT = "$exception";
const GOOGLE_GSI_SOURCE = "/gsi/client";
const GOOGLE_POPUP_CLOSED_MESSAGE = "popup window closed";

const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

export const isIgnorablePostHogException = (event: unknown): boolean => {
  if (!event || typeof event !== "object") {
    return false;
  }

  const maybePostHogEvent = event as PostHogEventLike;
  if (maybePostHogEvent.event !== POSTHOG_EXCEPTION_EVENT) {
    return false;
  }

  const properties = maybePostHogEvent.properties;
  const exceptionValues = getStringArray(properties?.$exception_values);
  const exceptionSources = getStringArray(properties?.$exception_sources);

  const isPopupCloseValue = exceptionValues.some((value) =>
    value.toLowerCase().includes(GOOGLE_POPUP_CLOSED_MESSAGE),
  );
  const isGoogleGsiSource = exceptionSources.some((value) =>
    value.toLowerCase().includes(GOOGLE_GSI_SOURCE),
  );

  return isPopupCloseValue && isGoogleGsiSource;
};
