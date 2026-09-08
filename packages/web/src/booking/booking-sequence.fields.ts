import {
  PICK_KEY_LABELS,
  physicalDigitIndex,
} from "@web/shortcuts/digit-pick.util";
import { normalizedKeyboardKey } from "@web/shortcuts/is-bare-letter-key";

/**
 * Hold-Mod chords for Meeting settings sections. Nav already owns 1/2/3.
 * Save stays Mod+Enter on Settings. Fields inside More options have no chord.
 *
 * Letter pool exclusions: editing (A C V X Z), find (F G), OS level (H M Q),
 * browser owned (N T W L), risky (R P S D), app owned (K palette, E edit
 * leader, comma settings).
 */
export const SETTINGS_MOD_LETTER_POOL = ["u", "i", "j", "y", "b", "o"] as const;

export const BOOKING_SECTION_CHORDS = [
  { key: "4", field: "enabled", label: "Meeting page on or off" },
  { key: "5", field: "duration", label: "Duration" },
  { key: "6", field: "timezone", label: "Timezone" },
  { key: "7", field: "hours", label: "Weekly hours" },
  { key: "8", field: "destination", label: "Destination calendar" },
  { key: "9", field: "more", label: "More options" },
  { key: "u", field: "link", label: "Copy link", activate: true },
] as const;

export type BookingSectionChord = (typeof BOOKING_SECTION_CHORDS)[number];

/** Every `data-booking-field` anchor, including More-options fields with no chord. */
export const BOOKING_FIELDS = [
  "enabled",
  "address",
  "duration",
  "destination",
  "blocking",
  "timezone",
  "hours",
  "more",
  "notice",
  "horizon",
  "link",
] as const;

export type BookingField = (typeof BOOKING_FIELDS)[number];

export const BOOKING_FIELD_ATTR = "data-booking-field";

export const bookingFieldAttrs = (field: BookingField) =>
  ({ [BOOKING_FIELD_ATTR]: field }) as const;

const chordForField = (field: BookingField): BookingSectionChord | undefined =>
  BOOKING_SECTION_CHORDS.find((entry) => entry.field === field);

/** Hold-Mod chip for a section, or nothing when the field has no chord. */
export const bookingJumpKeys = (field: BookingField): string[] => {
  const chord = chordForField(field);
  return chord ? [chord.key] : [];
};

export function bookingChordForEvent(
  event: Pick<KeyboardEvent, "code" | "key">,
): BookingSectionChord | null {
  const digit = physicalDigitIndex(event);
  const key =
    digit !== null
      ? (PICK_KEY_LABELS[digit] ?? null)
      : normalizedKeyboardKey(event);
  if (!key) return null;
  return BOOKING_SECTION_CHORDS.find((chord) => chord.key === key) ?? null;
}

const FOCUSABLE =
  'input, select, textarea, button, summary, [role="combobox"], [tabindex]:not([tabindex="-1"])';

const enclosingDialog = (node: Element | null): HTMLElement | null =>
  node instanceof HTMLElement ? node.closest("[role='dialog']") : null;

const isDisabledAnchor = (anchor: HTMLElement): boolean =>
  anchor.hasAttribute("disabled") ||
  ("disabled" in anchor && Boolean(anchor.disabled));

/**
 * Focus a booking field by data attribute rather than a selector map.
 *
 * Focus, never click: several of these targets are checkboxes, and the
 * Settings idiom's focus-then-click would toggle them on the way past.
 */
export function focusBookingField(field: BookingField): boolean {
  const anchor = document.querySelector<HTMLElement>(
    `[${BOOKING_FIELD_ATTR}="${field}"]`,
  );
  if (!anchor) return false;

  let enclosing: HTMLElement | null = anchor.closest("details");
  while (enclosing instanceof HTMLDetailsElement) {
    enclosing.open = true;
    enclosing = enclosing.parentElement?.closest("details") ?? null;
  }

  const target = anchor.matches(FOCUSABLE)
    ? anchor
    : anchor.querySelector<HTMLElement>(FOCUSABLE);
  if (!target) return false;

  target.focus();
  return true;
}

export function dispatchBookingChord(chord: BookingSectionChord): boolean {
  const anchor = document.querySelector<HTMLElement>(
    `[${BOOKING_FIELD_ATTR}="${chord.field}"]`,
  );
  if (!anchor) return false;
  if (isDisabledAnchor(anchor)) return false;

  const activeDialog = enclosingDialog(document.activeElement);
  const anchorDialog = enclosingDialog(anchor);
  if (activeDialog && activeDialog !== anchorDialog) {
    return true;
  }

  if ("activate" in chord && chord.activate) {
    anchor.focus({ preventScroll: true });
    anchor.click();
    return true;
  }

  return focusBookingField(chord.field);
}
