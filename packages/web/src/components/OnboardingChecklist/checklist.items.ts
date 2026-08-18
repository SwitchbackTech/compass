import { KEYMAP } from "@web/shortcuts/keymap";

/**
 * Post-showcase practice missions over the real sample events. Order is
 * display order; "signUp" stays last, it is the flow's exit. Completion
 * detection is deliberately loose (any qualifying action counts, on any
 * event): the checklist encourages, it does not examine.
 */
export const CHECKLIST_ITEMS = [
  {
    id: "jumpToEvent",
    label: "Jump to an event",
    keycaps: KEYMAP.eventJump.keycaps,
  },
  {
    id: "moveEvent",
    label: "Move an event",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  {
    id: "resizeEdge",
    label: "Stretch an event's end time",
    keycaps: KEYMAP.edgeFocus.keycaps,
  },
  {
    id: "placeDraft",
    label: "Place a new event on the grid",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  { id: "undo", label: "Undo a change", keycaps: KEYMAP.undo.keycaps },
  { id: "signUp", label: "Sign up to keep your calendar" },
] as const satisfies readonly {
  id: string;
  label: string;
  keycaps?: readonly string[];
}[];

export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

export type ChecklistItemId = ChecklistItem["id"];

/** Derived from the display list so the two can never disagree. */
export const CHECKLIST_ITEM_IDS: readonly ChecklistItemId[] =
  CHECKLIST_ITEMS.map((item) => item.id);
