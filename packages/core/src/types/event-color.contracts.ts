import { z } from "zod/v4";

// Compass-owned event color slots. Maps 1:1 onto Google's 11 event colors;
// providers adapt to/from these names at the boundary.
export const EventColorSlotSchema = z.enum([
  "lavender",
  "mint",
  "plum",
  "coral",
  "gold",
  "orange",
  "blue",
  "slate",
  "indigo",
  "green",
  "red",
]);
export type EventColorSlot = z.infer<typeof EventColorSlotSchema>;
