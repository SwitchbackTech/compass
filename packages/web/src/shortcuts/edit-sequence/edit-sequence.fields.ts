import { type EventFormFocusField } from "@web/common/utils/form/form.util";

/**
 * The one source of truth for the `e`-leader sequences: the dispatch map, the
 * which-key menu, and the shortcuts-legend rows are all derived from this
 * list, so behavior and documentation cannot drift apart.
 *
 * Data-only on purpose. The legend registry imports it, and pulling React or
 * the hotkeys runtime into that module would be a regression.
 */
// `digit` is the field's Mod+digit jump shortcut, assigned in the form's DOM
// order (title → schedule → recurrence → calendar → color → location →
// attendees → description) so the mapping is guessable without the hold-Mod
// hint chips. The array itself keeps its original key-taught order (unrelated
// to digit order) since EditSequenceMenu renders straight off this order.
// Account keeps digit 5 but has no letter key: `a` is guests.
export const EDIT_SEQUENCE_FIELDS = [
  { key: "t", field: "title", label: "Title", digit: "1" },
  { key: "l", field: "location", label: "Location", digit: "7" },
  { key: "d", field: "description", label: "Description", digit: "9" },
  { key: "s", field: "start", label: "Start time", digit: "2" },
  { key: "e", field: "end", label: "End time", digit: "3" },
  { key: "r", field: "recurrence", label: "Recurrence", digit: "4" },
  { field: "calendar", label: "Account", digit: "5" },
  { key: "c", field: "color", label: "Color", digit: "6" },
  { key: "a", field: "attendees", label: "Guests", digit: "8" },
] as const satisfies readonly {
  key?: string;
  field: EventFormFocusField;
  label: string;
  digit: string;
}[];

const hasEditSequenceKey = (
  entry: (typeof EDIT_SEQUENCE_FIELDS)[number],
): entry is (typeof EDIT_SEQUENCE_FIELDS)[number] & { key: string } =>
  "key" in entry;

/** Letter-sequence rows only — Account is digit-only. */
export const EDIT_SEQUENCE_LETTER_FIELDS =
  EDIT_SEQUENCE_FIELDS.filter(hasEditSequenceKey);

export type EditSequenceSecondKey =
  (typeof EDIT_SEQUENCE_LETTER_FIELDS)[number]["key"];

export type EditSequenceDigit = (typeof EDIT_SEQUENCE_FIELDS)[number]["digit"];

/** Second key → form field, for dispatch. */
export const EDIT_SEQUENCE_FIELD_BY_KEY = Object.fromEntries(
  EDIT_SEQUENCE_LETTER_FIELDS.map(({ key, field }) => [key, field]),
) as Record<EditSequenceSecondKey, EventFormFocusField>;

/** Digit → form field, for Mod+digit dispatch. */
export const EDIT_SEQUENCE_FIELD_BY_DIGIT = Object.fromEntries(
  EDIT_SEQUENCE_FIELDS.map(({ digit, field }) => [digit, field]),
) as Record<EditSequenceDigit, EventFormFocusField>;

/** Digit-ascending view of the same table, i.e. the form's DOM order. */
export const FORM_FIELD_DIGITS = [...EDIT_SEQUENCE_FIELDS].sort(
  (a, b) => Number(a.digit) - Number(b.digit),
);
