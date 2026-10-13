import { type Calendar } from "@core/types/calendar.contracts";
import {
  type ProviderKind,
  providerDisplayName,
} from "@core/types/sync/identity.contracts";
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

export const providerManagedScheduleToast = (
  calendar: Calendar | undefined,
): string => {
  const kind = resolveProviderKind(calendar);
  if (!kind) {
    return "This time is managed by your calendar and can't be edited here.";
  }
  return `This time is managed by ${CALENDAR_PRODUCT_NAME[kind]}.`;
};

export const providerManagedRecurrenceToast = (
  calendar: Calendar | undefined,
): string => {
  const kind = resolveProviderKind(calendar);
  if (!kind) {
    return "Recurrence is managed by your calendar and can't be edited here.";
  }
  return `Recurrence is managed by ${CALENDAR_PRODUCT_NAME[kind]}.`;
};

/** For tests and copy that need the account label without the sentence wrapper. */
export const calendarAccountProductName = (
  calendar: Calendar | undefined,
): string => {
  const kind = resolveProviderKind(calendar);
  if (!kind) return providerDisplayName("google");
  return CALENDAR_PRODUCT_NAME[kind];
};
