import { type EventFormFocusField } from "@web/common/utils/form/form.util";

/**
 * The one source of truth for the `e`-leader sequences: the dispatch map, the
 * which-key menu, and the shortcuts-legend rows are all derived from this
 * list, so behavior and documentation cannot drift apart.
 *
 * Data-only on purpose. The legend registry imports it, and pulling React or
 * the hotkeys runtime into that module would be a regression.
 */
export const EDIT_SEQUENCE_FIELDS = [
  { key: "t", field: "title", label: "Title" },
  { key: "l", field: "location", label: "Location" },
  { key: "d", field: "description", label: "Description" },
  { key: "s", field: "start", label: "Start time" },
  { key: "e", field: "end", label: "End time" },
  { key: "r", field: "recurrence", label: "Recurrence" },
  { key: "c", field: "calendar", label: "Calendar" },
] as const satisfies readonly {
  key: string;
  field: EventFormFocusField;
  label: string;
}[];

export type EditSequenceSecondKey =
  (typeof EDIT_SEQUENCE_FIELDS)[number]["key"];

/** Second key → form field, for dispatch. */
export const EDIT_SEQUENCE_FIELD_BY_KEY = Object.fromEntries(
  EDIT_SEQUENCE_FIELDS.map(({ key, field }) => [key, field]),
) as Record<EditSequenceSecondKey, EventFormFocusField>;
