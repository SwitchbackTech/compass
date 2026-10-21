import { type ProviderKind } from "@core/types/sync/identity.contracts";

/** User-facing calendar product names for provider save failures. */
const PROVIDER_CALENDAR_PRODUCT_NAME: Record<ProviderKind, string> = {
  google: "Google Calendar",
  microsoft: "Microsoft Calendar",
  apple: "Apple Calendar",
};

export function providerCalendarProductName(provider: ProviderKind): string {
  return PROVIDER_CALENDAR_PRODUCT_NAME[provider];
}

/**
 * Non-technical copy when a create/replace/delete could not reach the user's
 * calendar provider. When the provider is unknown, fall back to neutral wording.
 */
export function providerSaveFailureMessage(
  provider: ProviderKind | undefined,
): string {
  if (provider) {
    return `Couldn't save to ${providerCalendarProductName(provider)}. Your change wasn't saved.`;
  }
  return "Couldn't save that change, the calendar service had a problem. Your edit was not applied.";
}

/** When Google returns a generic badRequest for an otherwise valid edit. */
export function googleProviderRejectedChangeMessage(): string {
  return "Google rejected this change. Your edit wasn't saved. Try again.";
}
