/**
 * The one source of truth for the booking form's `e`-leader sequences: the
 * dispatch map, the which-key menu, the hold-Mod chips beside each label, and
 * the shortcuts-legend row all derive from this list, so behavior and
 * documentation cannot drift apart.
 *
 * Data-only on purpose, mirroring edit-sequence.fields.ts.
 *
 * `s` is deliberately absent so it can type in hours and welcome fields.
 * Save is Mod+Enter, owned by Settings. Digits are unavailable too - Settings
 * nav owns 1/2/3 - which is why this surface reuses the letter leader rather
 * than the event form's Mod+digit jump.
 */
export const BOOKING_SEQUENCE_FIELDS = [
  { key: "e", field: "enabled", label: "Enable booking" },
  { key: "d", field: "duration", label: "Duration" },
  { key: "c", field: "destination", label: "Destination calendar" },
  { key: "b", field: "blocking", label: "Blocking calendars" },
  { key: "z", field: "timezone", label: "Booking timezone" },
  { key: "h", field: "hours", label: "Weekly hours" },
  { key: "w", field: "welcome", label: "Welcome text" },
  { key: "n", field: "notice", label: "Minimum notice" },
  { key: "x", field: "horizon", label: "Maximum horizon" },
  { key: "o", field: "options", label: "Buffer and limits" },
  { key: "l", field: "link", label: "Booking link" },
] as const satisfies readonly {
  key: string;
  field: string;
  label: string;
}[];

export type BookingSequenceField =
  (typeof BOOKING_SEQUENCE_FIELDS)[number]["field"];

/** Second key -> booking field, for dispatch. */
export const BOOKING_FIELD_BY_KEY = Object.fromEntries(
  BOOKING_SEQUENCE_FIELDS.map(({ key, field }) => [key, field]),
) as Record<string, BookingSequenceField>;

export const BOOKING_FIELD_ATTR = "data-booking-field";

export const bookingFieldAttrs = (field: BookingSequenceField) =>
  ({ [BOOKING_FIELD_ATTR]: field }) as const;

/** The key a given field answers to, for rendering a chip beside its label. */
export const bookingFieldKey = (field: BookingSequenceField): string =>
  BOOKING_SEQUENCE_FIELDS.find((entry) => entry.field === field)?.key ?? "";

/** Hold-Mod chips for a field: leader then the field's letter. */
export const bookingJumpKeys = (field: BookingSequenceField): string[] => [
  "e",
  bookingFieldKey(field),
];

const FOCUSABLE =
  'input, select, textarea, button, [role="combobox"], [tabindex]:not([tabindex="-1"])';

/**
 * Focus a booking field by data attribute rather than a selector map.
 *
 * Focus, never click: several of these targets are checkboxes, and the
 * Settings idiom's focus-then-click would toggle them on the way past.
 */
export function focusBookingField(field: BookingSequenceField): boolean {
  const anchor = document.querySelector<HTMLElement>(
    `[${BOOKING_FIELD_ATTR}="${field}"]`,
  );
  if (!anchor) return false;

  const target = anchor.matches(FOCUSABLE)
    ? anchor
    : anchor.querySelector<HTMLElement>(FOCUSABLE);
  if (!target) return false;

  target.focus();
  return true;
}
