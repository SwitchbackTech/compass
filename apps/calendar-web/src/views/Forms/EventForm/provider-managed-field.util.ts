import { type Calendar } from "@core/types/calendar.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { calendarProviderKind } from "@web/auth/providers/connection-provider.util";

const CALENDAR_PRODUCT_NAME: Record<ProviderKind, string> = {
  google: "Google Calendar",
  microsoft: "Outlook",
  apple: "iCloud Calendar",
};

const resolveProviderKind = (
  calendar: Calendar | undefined,
): ProviderKind | undefined =>
  calendar ? calendarProviderKind(calendar) : "google";

const providerManagedToast = (
  calendar: Calendar | undefined,
  generic: string,
  named: (product: string) => string,
): string => {
  const kind = resolveProviderKind(calendar);
  if (!kind) return generic;
  return named(CALENDAR_PRODUCT_NAME[kind]);
};

export const providerManagedScheduleToast = (
  calendar: Calendar | undefined,
): string =>
  providerManagedToast(
    calendar,
    "This time is managed by your calendar and can't be edited here.",
    (product) => `This time is managed by ${product}.`,
  );

export const providerManagedRecurrenceToast = (
  calendar: Calendar | undefined,
): string =>
  providerManagedToast(
    calendar,
    "Recurrence is managed by your calendar and can't be edited here.",
    (product) => `Recurrence is managed by ${product}.`,
  );
