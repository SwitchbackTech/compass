import { type Calendar } from "@core/types/calendar.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { calendarProviderKind } from "@web/auth/providers/connection-provider.util";

// Deliberately not provider-copy's CALENDAR_PRODUCT_NAME: a lock toast names
// the app the event came from ("Outlook", "iCloud Calendar"), where connect
// and reconnect copy names the account ("Microsoft Calendar", "Apple
// Calendar"). Keep the two apart rather than folding them together.
const PROVIDER_MANAGED_PRODUCT_NAME: Record<ProviderKind, string> = {
  google: "Google Calendar",
  microsoft: "Outlook",
  apple: "iCloud Calendar",
};

const PROVIDER_MANAGED_SCHEDULE_NOTE_SUBJECT: Record<ProviderKind, string> = {
  google: "Google",
  microsoft: "Microsoft Outlook",
  apple: "Apple",
};

const PROVIDER_MANAGED_SCHEDULE_NOTE_TAIL =
  " keeps this event's time updated. Your title, notes, and location edits stay in Compass.";

// An undefined kind means there is no product to name: the local calendar, or
// a calendar the lookup has not resolved yet. Both take the generic sentence,
// never a guessed provider.
const providerManagedToast = (
  calendar: Calendar | undefined,
  generic: string,
  named: (product: string) => string,
): string => {
  const kind = calendar ? calendarProviderKind(calendar) : undefined;
  if (!kind) return generic;
  return named(PROVIDER_MANAGED_PRODUCT_NAME[kind]);
};

export const providerManagedScheduleToast = (
  calendar: Calendar | undefined,
): string =>
  providerManagedToast(
    calendar,
    "This time is managed by your calendar and can't be edited here.",
    (product) => `This time is managed by ${product}.`,
  );

export const providerManagedScheduleNote = (
  calendar: Calendar | undefined,
): string => {
  const kind = calendar ? calendarProviderKind(calendar) : undefined;
  const subject = kind
    ? PROVIDER_MANAGED_SCHEDULE_NOTE_SUBJECT[kind]
    : "Your calendar";
  return `${subject}${PROVIDER_MANAGED_SCHEDULE_NOTE_TAIL}`;
};

export const providerManagedRecurrenceToast = (
  calendar: Calendar | undefined,
): string =>
  providerManagedToast(
    calendar,
    "Recurrence is managed by your calendar and can't be edited here.",
    (product) => `Recurrence is managed by ${product}.`,
  );
