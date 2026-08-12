import { KEYMAP } from "@web/shortcuts/keymap";

/**
 * Post-showcase practice missions over the real sample events. Order is
 * display order; "signUp" stays last, it is the flow's exit. Completion
 * detection is deliberately loose (any qualifying action counts, on any
 * event): the checklist encourages, it does not examine.
 */
const ITEM_IDS = [
  "jumpToEvent",
  "moveEvent",
  "resizeEdge",
  "placeDraft",
  "undo",
  "signUp",
] as const;

export type ChecklistItemId = (typeof ITEM_IDS)[number];

export const CHECKLIST_ITEM_IDS: readonly ChecklistItemId[] = ITEM_IDS;

export type ChecklistItem = {
  id: ChecklistItemId;
  label: string;
  keycaps?: readonly string[];
};

export const CHECKLIST_ITEMS: readonly ChecklistItem[] = [
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
    label: "Drop a new event on the grid",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  { id: "undo", label: "Undo a change", keycaps: KEYMAP.undo.keycaps },
  { id: "signUp", label: "Sign up to keep your calendar" },
];
