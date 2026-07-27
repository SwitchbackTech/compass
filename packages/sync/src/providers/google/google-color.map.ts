import { type EventColorSlot } from "@core/types/event-color.contracts";

// Google Calendar event colorId values (1-11) mapped to Compass color slots.
// See https://developers.google.com/workspace/calendar/api/v3/reference/colors
export const GOOGLE_COLOR_ID_TO_SLOT = {
  "1": "lavender",
  "2": "mint",
  "3": "plum",
  "4": "coral",
  "5": "gold",
  "6": "orange",
  "7": "blue",
  "8": "slate",
  "9": "indigo",
  "10": "green",
  "11": "red",
} as const satisfies Record<string, EventColorSlot>;

export const SLOT_TO_GOOGLE_COLOR_ID = Object.fromEntries(
  Object.entries(GOOGLE_COLOR_ID_TO_SLOT).map(([id, slot]) => [slot, id]),
) as { readonly [K in EventColorSlot]: string };

export function googleColorIdToSlot(
  colorId: string | null | undefined,
): EventColorSlot | undefined {
  if (colorId == null) return undefined;
  return GOOGLE_COLOR_ID_TO_SLOT[
    colorId as keyof typeof GOOGLE_COLOR_ID_TO_SLOT
  ];
}

export function slotToGoogleColorId(slot: EventColorSlot): string {
  return SLOT_TO_GOOGLE_COLOR_ID[slot];
}
