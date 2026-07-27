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

// Optional on reads; nullable on write commands so null can clear a tag.
export const OptionalNullableEventColorSchema =
  EventColorSlotSchema.nullable().optional();

// Spread into an object literal: include `color` only when the caller set it.
// Undefined means "leave the field out". Overloads keep slot-only call sites
// from widening to `null`.
export function withColor(
  color: EventColorSlot | undefined,
): { color: EventColorSlot } | Record<string, never>;
export function withColor(
  color: EventColorSlot | null | undefined,
): { color: EventColorSlot | null } | Record<string, never>;
export function withColor(
  color: EventColorSlot | null | undefined,
): { color: EventColorSlot | null } | Record<string, never> {
  return color === undefined ? {} : { color };
}
